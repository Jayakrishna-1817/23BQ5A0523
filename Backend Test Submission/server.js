import express from 'express';
import cors from 'cors';
import process from 'process';
import { URLStore } from './models/urlStore.js';
import { Logger, requestLogger } from './middleware/logger.js';

const app = express();
const PORT = 3000;
const urlStore = new URLStore();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger); // MANDATORY logging middleware

// Error handling middleware
const errorHandler = (error, req, res, next) => {
  Logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url
  });

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
};

// Input validation middleware
const validateCreateURLInput = (req, res, next) => {
  const { url, validity } = req.body;

  if (!url) {
    Logger.warn('Missing required field: url', { body: req.body });
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required field: url'
    });
  }

  if (validity !== undefined) {
    const validityNum = parseInt(validity);
    if (isNaN(validityNum) || validityNum <= 0) {
      Logger.warn('Invalid validity period', { validity });
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Validity must be a positive integer representing minutes'
      });
    }
    req.body.validity = validityNum;
  }

  next();
};

// API Routes

// Create Short URL - POST /shorturls
app.post('/shorturls', validateCreateURLInput, (req, res) => {
  try {
    const { url, validity = 30, shortcode } = req.body;

    Logger.info('Creating short URL request', { url, validity, shortcode });

    const result = urlStore.createShortURL(url, validity, shortcode);

    Logger.info('Short URL created successfully', result);

    res.status(201).json(result);
  } catch (error) {
    Logger.error('Error creating short URL', { error: error.message, body: req.body });

    if (error.message.includes('Invalid URL format')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid URL format'
      });
    }

    if (error.message.includes('shortcode already exists') || error.message.includes('Shortcode collision')) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Shortcode already exists'
      });
    }

    if (error.message.includes('Invalid shortcode format')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid shortcode format. Must be alphanumeric and up to 20 characters'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create short URL'
    });
  }
});

// Redirect to Original URL - GET /:shortcode
app.get('/:shortcode', (req, res) => {
  const { shortcode } = req.params;

  Logger.info('Redirect request', { shortcode });

  const urlData = urlStore.getOriginalURL(shortcode);

  if (!urlData) {
    Logger.warn('Shortcode not found or expired', { shortcode });
    return res.status(404).json({
      error: 'Not Found',
      message: 'Short URL not found or has expired'
    });
  }

  // Record the click for analytics
  const referrer = req.get('Referer') || '';
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress || '';

  urlStore.recordClick(shortcode, referrer, userAgent, ip);

  Logger.info('Redirecting to original URL', { 
    shortcode, 
    originalUrl: urlData.originalUrl,
    referrer,
    ip
  });

  res.redirect(urlData.originalUrl);
});

// Get URL Statistics - GET /shorturls/:shortcode
app.get('/shorturls/:shortcode', (req, res) => {
  const { shortcode } = req.params;

  Logger.info('Statistics request', { shortcode });

  const analytics = urlStore.getAnalytics(shortcode);

  if (!analytics) {
    Logger.warn('Statistics not found for shortcode', { shortcode });
    return res.status(404).json({
      error: 'Not Found',
      message: 'Short URL not found'
    });
  }

  Logger.info('Statistics retrieved', { shortcode, totalClicks: analytics.totalClicks });

  res.json(analytics);
});

// Get All URLs Statistics (for frontend statistics page)
app.get('/api/statistics', (req, res) => {
  Logger.info('All statistics request');

  const allUrls = urlStore.getAllURLs();

  Logger.info('All statistics retrieved', { count: allUrls.length });

  res.json({
    urls: allUrls,
    totalUrls: allUrls.length,
    totalClicks: allUrls.reduce((sum, url) => sum + url.totalClicks, 0)
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  Logger.warn('Route not found', { method: req.method, url: req.url });
  res.status(404).json({
    error: 'Not Found',
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  Logger.info('URL Shortener Microservice started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  console.log(`\nURL Shortener Microservice running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Statistics API: http://localhost:${PORT}/api/statistics`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  Logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
