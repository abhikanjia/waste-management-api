const db = require('../config/database');

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE userId = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create or update user
exports.createOrUpdateUser = async (req, res) => {
    try {
        const { userId, name, email, phone, languagePreference, profilePictureUrl } = req.body;
        const now = new Date();

        const [existing] = await db.execute(
            'SELECT userId FROM users WHERE userId = ?',
            [userId]
        );

        if (existing.length > 0) {
            // Update existing user - manually set updatedAt
            await db.execute(
                `UPDATE users SET name = ?, email = ?, phone = ?, 
         languagePreference = ?, profilePictureUrl = ?, updatedAt = ?
         WHERE userId = ?`,
                [name, email, phone, languagePreference, profilePictureUrl, now, userId]
            );
        } else {
            // Create new user
            await db.execute(
                `INSERT INTO users (userId, name, email, phone, languagePreference, profilePictureUrl, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, name, email, phone, languagePreference || 'en', profilePictureUrl, now, now]
            );
        }

        res.json({ success: true, message: 'User saved successfully' });
    } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const [stats] = await db.execute(
            `SELECT totalComplaints, resolvedComplaints, pendingComplaints 
       FROM users WHERE userId = ?`,
            [userId]
        );

        res.json({ success: true, data: stats[0] || {} });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};