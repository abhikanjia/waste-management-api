const db = require('../config/database');

// Get all categories
exports.getAllCategories = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM categories WHERE isActive = TRUE ORDER BY displayOrder'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
