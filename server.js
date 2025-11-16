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

        // Simple test query
        const [rows] = await db.execute('SELECT 1 as test, NOW() as current_time');

        res.json({
            success: true,
            message: 'Database connected!',
            data: rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('=== DATABASE ERROR ===');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Errno:', error.errno);
        console.error('SQL State:', error.sqlState);
        console.error('====================');

        res.status(500).json({
            success: false,
            error: error.message,
            errorCode: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            hint: error.code === 'ER_ACCESS_DENIED_ERROR' ? 'Check your MySQL username and password' :
                error.code === 'ECONNREFUSED' ? 'MySQL server is not running or wrong host' :
                    error.code === 'ER_BAD_DB_ERROR' ? 'Database does not exist. Create it first.' :
                        'Check your .env file and MySQL connection'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});