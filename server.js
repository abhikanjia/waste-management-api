const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API is running' });
});

// TEST DATABASE CONNECTION - Add this route FIRST
app.get('/api/test-db', async (req, res) => {
    try {
        const db = require('./config/database');
        const [rows] = await db.execute('SELECT 1 as test');
        res.json({ success: true, message: 'Database connected!', data: rows });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Check your .env file and MySQL connection'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});