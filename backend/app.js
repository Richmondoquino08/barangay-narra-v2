const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

// Middleware imports
const { errorHandler, asyncHandler } = require('./middleware/errorHandler');
const { requireAuth } = require('./middleware/auth');

// Route imports
const authRoutes = require('./routes/auth');
const residentRoutes = require('./routes/residents');
const userRoutes = require('./routes/users');
const requestRoutes = require('./routes/requests');
const financeRoutes = require('./routes/finance');
const announcementRoutes = require('./routes/announcement');
const blotterRoutes = require('./routes/blotter');
const documentRoutes = require('./routes/documents');
const settingsRoutes = require('./routes/settings');
const auditRoutes = require('./routes/audit');
const certificateRoutes = require('./routes/certificates');

const app = express();

// Create upload directories
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PROFILE_DIR = path.join(UPLOAD_DIR, 'profiles');
const DOCUMENT_DIR = path.join(UPLOAD_DIR, 'documents');
const TEMPLATE_DIR = path.join(UPLOAD_DIR, 'templates');
const CERTIFICATE_DIR = path.join(UPLOAD_DIR, 'certificates');

[UPLOAD_DIR, PROFILE_DIR, DOCUMENT_DIR, TEMPLATE_DIR, CERTIFICATE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static file serving
app.use('/uploads/profiles', express.static(PROFILE_DIR));
app.use('/uploads/documents', express.static(DOCUMENT_DIR));
app.use('/uploads/templates', express.static(TEMPLATE_DIR));
app.use('/uploads/certificates', express.static(CERTIFICATE_DIR));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Barangay Management System API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', requireAuth, userRoutes);
app.use('/api/residents', requireAuth, residentRoutes);
app.use('/api/requests', requireAuth, requestRoutes);
app.use('/api/certificates', requireAuth, certificateRoutes);
app.use('/api/finance', requireAuth, financeRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/blotter', requireAuth, blotterRoutes);
app.use('/api/documents', requireAuth, documentRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/audit', requireAuth, auditRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
//const HOST = process.env.HOST || 'localhost';
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════╗
║  Barangay Management System - Backend   ║
║  Environment: ${process.env.NODE_ENV || 'development'.padEnd(26)}║
║  Server: http://${HOST}:${PORT}
║  API Base: http://${HOST}:${PORT}/api
╚════════════════════════════════════════╝
  `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
