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
const officialsRoutes = require('./routes/officials');
const projectsRoutes  = require('./routes/projects');
const assetsRoutes    = require('./routes/assets');
const socialRoutes    = require('./routes/socialPrograms');
const drrmRoutes      = require('./routes/drrm');
const budgetRoutes    = require('./routes/budget');
const refDocsRoutes   = require('./routes/refDocs');
const financeFormsRoutes = require('./routes/financeForms');
const raoRoutes = require('./routes/rao');
const procurementRoutes = require('./routes/procurement');
const cashbookRoutes = require('./routes/cashbook');
const collectionsRoutes = require('./routes/collections');
const transmittalRoutes = require('./routes/transmittal');
const trashRoutes = require('./routes/trash');
const trashService = require('./services/trashService');

const app = express();

// Trust the first proxy hop (nginx in production) so req.ip and the rate
// limiter see each real client's actual address instead of nginx's own —
// without this, every user behind the reverse proxy collapses into a single
// IP bucket and shares one rate-limit budget for the entire office.
app.set('trust proxy', 1);

// Create upload directories
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PROFILE_DIR = path.join(UPLOAD_DIR, 'profiles');
const DOCUMENT_DIR = path.join(UPLOAD_DIR, 'documents');
const TEMPLATE_DIR = path.join(UPLOAD_DIR, 'templates');
const CERTIFICATE_DIR = path.join(UPLOAD_DIR, 'certificates');
const SETTINGS_DIR    = path.join(UPLOAD_DIR, 'settings');

[UPLOAD_DIR, PROFILE_DIR, DOCUMENT_DIR, TEMPLATE_DIR, CERTIFICATE_DIR, SETTINGS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  // Now that the site is served over a trusted HTTPS cert (via Tailscale),
  // tell browsers to always use HTTPS for this host and never silently
  // fall back to plain HTTP. preload is left off since that's an
  // irreversible public-list submission meant for public domains, not a
  // private .ts.net hostname.
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: false,
  },
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
}));
app.use(compression());

// CORS — allow any origin in dev; use specific origin in prod
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin,   // true = reflect request origin (works with credentials)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please wait a moment and try again.' }
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
app.use('/uploads/settings',  express.static(SETTINGS_DIR));
app.use('/uploads/ref-docs',  express.static(path.join(__dirname, 'uploads/ref-docs')));

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
app.use('/api/settings', settingsRoutes);   // GET is public; auth enforced per-route inside
app.use('/api/audit', requireAuth, auditRoutes);
app.use('/api/officials', requireAuth, officialsRoutes);
app.use('/api/projects', requireAuth, projectsRoutes);
app.use('/api/assets', requireAuth, assetsRoutes);
app.use('/api/social', requireAuth, socialRoutes);
app.use('/api/drrm',   requireAuth, drrmRoutes);
app.use('/api/budget',   requireAuth, budgetRoutes);
app.use('/api/ref-docs', requireAuth, refDocsRoutes);
app.use('/api/finance-forms', requireAuth, financeFormsRoutes);
app.use('/api/rao', requireAuth, raoRoutes);
app.use('/api/procurement', requireAuth, procurementRoutes);
app.use('/api/cashbook', requireAuth, cashbookRoutes);
app.use('/api/collections', requireAuth, collectionsRoutes);
app.use('/api/transmittal', requireAuth, transmittalRoutes);
app.use('/api/search', requireAuth, require('./routes/search'));
app.use('/api/trash', requireAuth, trashRoutes);

// Serve frontend production build
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found', path: req.path });
  });
}

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

// Trash auto-purge — anything past the retention window (see trashService.js)
// gets permanently removed, regardless of whether a user already hid it from
// their own view. Runs once on startup, then every 6 hours.
trashService.purgeExpired().catch(err => console.error('[trash] purge error:', err.message));
setInterval(() => {
  trashService.purgeExpired().catch(err => console.error('[trash] purge error:', err.message));
}, 6 * 60 * 60 * 1000);

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
