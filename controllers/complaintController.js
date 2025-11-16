const db = require('../config/database');

// Get all complaints (with filters)
exports.getAllComplaints = async (req, res) => {
    try {
        const { userId, status, categoryId, city, limit = 20, offset = 0 } = req.query;

        let query = 'SELECT * FROM complaints WHERE 1=1';
        const params = [];

        if (userId) {
            query += ' AND userId = ?';
            params.push(userId);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (categoryId) {
            query += ' AND categoryId = ?';
            params.push(categoryId);
        }

        if (city) {
            query += ' AND city = ?';
            params.push(city);
        }

        query += ' ORDER BY submittedAt DESC';

        const [rows] = await db.execute(query, params);

        // Get images for each complaint separately
        for (let complaint of rows) {
            const [images] = await db.execute(
                'SELECT imageUrl FROM complaint_images WHERE complaintId = ? ORDER BY uploadOrder',
                [complaint.complaintId]
            );
            complaint.imageUrls = images.map(img => img.imageUrl);
        }

        // Apply pagination in JavaScript
        const pagLimit = parseInt(limit);
        const pagOffset = parseInt(offset);
        const paginated = rows.slice(pagOffset, pagOffset + pagLimit);

        res.json({
            success: true,
            data: paginated,
            total: rows.length,
            limit: pagLimit,
            offset: pagOffset
        });
    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get single complaint by ID
exports.getComplaintById = async (req, res) => {
    try {
        const { complaintId } = req.params;

        const [complaints] = await db.execute(
            'SELECT * FROM complaints WHERE complaintId = ?',
            [complaintId]
        );

        if (complaints.length === 0) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        const complaint = complaints[0];

        // Get images separately
        const [images] = await db.execute(
            'SELECT imageUrl FROM complaint_images WHERE complaintId = ? ORDER BY uploadOrder',
            [complaintId]
        );
        complaint.imageUrls = images.map(img => img.imageUrl);

        res.json({ success: true, data: complaint });
    } catch (error) {
        console.error('Error fetching complaint:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create new complaint
exports.createComplaint = async (req, res) => {
    try {
        const {
            userId, userName, userEmail, userPhone, title, description,
            categoryId, categoryName, latitude, longitude, address,
            city, state, pincode, locality, status, priority, imageUrls
        } = req.body;

        // Generate complaint ID
        const complaintId = `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();

        // Insert complaint
        await db.execute(
            `INSERT INTO complaints (
        complaintId, userId, userName, userEmail, userPhone, title, description,
        categoryId, categoryName, latitude, longitude, address, city, state,
        pincode, locality, status, priority, submittedAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                complaintId, userId, userName, userEmail, userPhone, title, description,
                categoryId, categoryName, latitude, longitude, address, city, state,
                pincode, locality, status || 'submitted', priority || 'medium', now, now
            ]
        );

        // Insert images if provided
        if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
            for (let i = 0; i < imageUrls.length; i++) {
                await db.execute(
                    `INSERT INTO complaint_images (complaintId, imageUrl, isThumbnail, uploadOrder)
           VALUES (?, ?, ?, ?)`,
                    [complaintId, imageUrls[i], i === 0 ? 1 : 0, i]
                );
            }
        }

        // Update user stats
        await db.execute(
            'UPDATE users SET totalComplaints = totalComplaints + 1, pendingComplaints = pendingComplaints + 1, updatedAt = ? WHERE userId = ?',
            [now, userId]
        );

        res.status(201).json({
            success: true,
            data: { complaintId, ...req.body },
            message: 'Complaint created successfully'
        });
    } catch (error) {
        console.error('Error creating complaint:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update complaint status
exports.updateComplaintStatus = async (req, res) => {
    try {
        const { complaintId } = req.params;
        const { status, userId, notes } = req.body;
        const now = new Date();

        // Get current status
        const [complaints] = await db.execute(
            'SELECT status, userId FROM complaints WHERE complaintId = ?',
            [complaintId]
        );

        if (complaints.length === 0) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        const previousStatus = complaints[0].status;
        const complaintUserId = complaints[0].userId;

        // Update complaint - manually set updatedAt and resolvedAt
        const resolvedAt = status === 'resolved' ? now : null;

        await db.execute(
            `UPDATE complaints 
       SET status = ?, updatedAt = ?, resolvedAt = ? 
       WHERE complaintId = ?`,
            [status, now, resolvedAt, complaintId]
        );

        // Add status history
        await db.execute(
            `INSERT INTO complaint_status_history 
       (complaintId, userId, previousStatus, newStatus, changedBy, notes, createdAt)
       VALUES (?, ?, ?, ?, 'user', ?, ?)`,
            [complaintId, userId, previousStatus, status, notes || '', now]
        );

        // Update user stats if resolved
        if (status === 'resolved' && previousStatus !== 'resolved') {
            await db.execute(
                'UPDATE users SET resolvedComplaints = resolvedComplaints + 1, pendingComplaints = pendingComplaints - 1, updatedAt = ? WHERE userId = ?',
                [now, complaintUserId]
            );
        }

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get user's complaints
exports.getUserComplaints = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.query;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        let query = 'SELECT * FROM complaints WHERE userId = ?';
        const params = [userId];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY submittedAt DESC';

        const [rows] = await db.execute(query, params);

        // Get images for each complaint separately
        for (let complaint of rows) {
            const [images] = await db.execute(
                'SELECT imageUrl FROM complaint_images WHERE complaintId = ? ORDER BY uploadOrder',
                [complaint.complaintId]
            );
            complaint.imageUrls = images.map(img => img.imageUrl);
        }

        // Apply pagination in JavaScript
        const paginated = rows.slice(offset, offset + limit);

        res.json({
            success: true,
            data: paginated,
            total: rows.length,
            limit: limit,
            offset: offset
        });
    } catch (error) {
        console.error('Error fetching user complaints:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};