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

app.get('/api/test-db', async (req, res) => {
    try {
        const db = require('./config/database');

        // Simple SELECT query - works with TiDB
        const [rows] = await db.execute('SELECT 1 as test');

        res.json({
            success: true,
            message: 'Database connected successfully!',
            data: rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            errorCode: error.code,
            errno: error.errno,
            sqlState: error.sqlState
        });
    }
});



// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});