const db = require('../config/database');

// Get all notifications for a user
exports.getUserNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const [rows] = await db.execute(
            `SELECT * FROM notifications 
       WHERE userId = ? 
       ORDER BY createdAt DESC 
       LIMIT ? OFFSET ?`,
            [userId, parseInt(limit), parseInt(offset)]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get unread notifications
exports.getUnreadNotifications = async (req, res) => {
    try {
        const { userId } = req.params;

        const [rows] = await db.execute(
            `SELECT * FROM notifications 
       WHERE userId = ? AND isRead = FALSE 
       ORDER BY createdAt DESC`,
            [userId]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching unread notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create notification
exports.createNotification = async (req, res) => {
    try {
        const { userId, type, title, body, complaintId, status } = req.body;

        const [result] = await db.execute(
            `INSERT INTO notifications (userId, type, title, body, complaintId, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, type, title, body, complaintId || null, status || null]
        );

        res.status(201).json({
            success: true,
            data: { notificationId: result.insertId, ...req.body },
            message: 'Notification created successfully'
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        await db.execute(
            `UPDATE notifications 
       SET isRead = TRUE, readAt = NOW() 
       WHERE notificationId = ?`,
            [notificationId]
        );

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Mark all notifications as read for a user
exports.markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;

        await db.execute(
            `UPDATE notifications 
       SET isRead = TRUE, readAt = NOW() 
       WHERE userId = ? AND isRead = FALSE`,
            [userId]
        );

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error updating notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};