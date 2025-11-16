const db = require('../config/database');

// Get all complaints (with filters)
exports.getAllComplaints = async (req, res) => {
    try {
        const { userId, status, categoryId, city } = req.query;

        let query = `
      SELECT c.*, 
             COALESCE(GROUP_CONCAT(ci.imageUrl ORDER BY ci.uploadOrder SEPARATOR ','), '') as imageUrls
      FROM complaints c
      LEFT JOIN complaint_images ci ON c.complaintId = ci.complaintId
      WHERE 1=1
    `;
        const params = [];

        if (userId) {
            query += ' AND c.userId = ?';
            params.push(userId);
        }

        if (status) {
            query += ' AND c.status = ?';
            params.push(status);
        }

        if (categoryId) {
            query += ' AND c.categoryId = ?';
            params.push(categoryId);
        }

        if (city) {
            query += ' AND c.city = ?';
            params.push(city);
        }

        query += ' GROUP BY c.complaintId ORDER BY c.submittedAt DESC';

        const [rows] = await db.execute(query, params);

        // Process imageUrls
        const complaints = rows.map(row => ({
            ...row,
            imageUrls: row.imageUrls && row.imageUrls.length > 0 ? row.imageUrls.split(',').filter(url => url.trim()) : []
        }));

        res.json({ success: true, data: complaints });
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
            `SELECT c.*, 
              GROUP_CONCAT(ci.imageUrl ORDER BY ci.uploadOrder) as imageUrls
       FROM complaints c
       LEFT JOIN complaint_images ci ON c.complaintId = ci.complaintId
       WHERE c.complaintId = ?
       GROUP BY c.complaintId`,
            [complaintId]
        );

        if (complaints.length === 0) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        const complaint = {
            ...complaints[0],
            imageUrls: complaints[0].imageUrls ? complaints[0].imageUrls.split(',') : []
        };

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

        // Insert complaint
        const [result] = await db.execute(
            `INSERT INTO complaints (
        complaintId, userId, userName, userEmail, userPhone, title, description,
        categoryId, categoryName, latitude, longitude, address, city, state,
        pincode, locality, status, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                complaintId, userId, userName, userEmail, userPhone, title, description,
                categoryId, categoryName, latitude, longitude, address, city, state,
                pincode, locality, status || 'submitted', priority || 'medium'
            ]
        );

        // Insert images if provided
        if (imageUrls && imageUrls.length > 0) {
            const imageValues = imageUrls.map((url, index) => [
                complaintId, url, index === 0, index
            ]);

            await db.query(
                `INSERT INTO complaint_images (complaintId, imageUrl, isThumbnail, uploadOrder)
         VALUES ?`,
                [imageValues]
            );
        }

        // Update user stats
        await db.execute(
            'UPDATE users SET totalComplaints = totalComplaints + 1, pendingComplaints = pendingComplaints + 1 WHERE userId = ?',
            [userId]
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

        // Update complaint
        await db.execute(
            `UPDATE complaints 
       SET status = ?, updatedAt = NOW(), 
           resolvedAt = CASE WHEN ? = 'resolved' THEN NOW() ELSE resolvedAt END
       WHERE complaintId = ?`,
            [status, status, complaintId]
        );

        // Add status history
        await db.execute(
            `INSERT INTO complaint_status_history 
       (complaintId, userId, previousStatus, newStatus, changedBy, notes)
       VALUES (?, ?, ?, ?, 'user', ?)`,
            [complaintId, userId, previousStatus, status, notes || '']
        );

        // Update user stats if resolved
        if (status === 'resolved' && previousStatus !== 'resolved') {
            await db.execute(
                'UPDATE users SET resolvedComplaints = resolvedComplaints + 1, pendingComplaints = pendingComplaints - 1 WHERE userId = ?',
                [complaintUserId]
            );
        }

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get user's complaints - FIXED VERSION
exports.getUserComplaints = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.query;

        let query = `
      SELECT c.*, 
             COALESCE(GROUP_CONCAT(ci.imageUrl ORDER BY ci.uploadOrder SEPARATOR ','), '') as imageUrls
      FROM complaints c
      LEFT JOIN complaint_images ci ON c.complaintId = ci.complaintId
      WHERE c.userId = ?
    `;
        const params = [userId];

        if (status) {
            query += ' AND c.status = ?';
            params.push(status);
        }

        query += ' GROUP BY c.complaintId ORDER BY c.submittedAt DESC';

        const [rows] = await db.execute(query, params);

        // Process imageUrls
        const complaints = rows.map(row => ({
            ...row,
            imageUrls: row.imageUrls && row.imageUrls.length > 0
                ? row.imageUrls.split(',').filter(url => url.trim())
                : []
        }));

        res.json({ success: true, data: complaints });
    } catch (error) {
        console.error('Error fetching user complaints:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};