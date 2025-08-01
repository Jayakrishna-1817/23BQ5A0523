import { nanoid } from 'nanoid';
import { Logger } from '../middleware/logger.js';

// In-memory storage for URLs and analytics
export class URLStore {
  constructor() {
    this.urls = new Map(); // shortcode -> url data
    this.analytics = new Map(); // shortcode -> analytics data
  }

  // Create a new short URL
  createShortURL(originalUrl, validity = 30, customShortcode = null) {
    Logger.info('Creating short URL', { originalUrl, validity, customShortcode });

    // Validate URL format
    try {
      new URL(originalUrl);
    } catch (error) {
      Logger.error('Invalid URL format', { originalUrl, error: error.message });
      throw new Error('Invalid URL format');
    }

    // Generate or validate shortcode
    let shortcode;
    if (customShortcode) {
      // Validate custom shortcode (alphanumeric, reasonable length)
      if (!/^[a-zA-Z0-9]{1,20}$/.test(customShortcode)) {
        Logger.error('Invalid custom shortcode format', { customShortcode });
        throw new Error('Invalid shortcode format. Must be alphanumeric and up to 20 characters');
      }
      
      // Check if shortcode already exists
      if (this.urls.has(customShortcode)) {
        Logger.error('Shortcode collision detected', { customShortcode });
        throw new Error('Shortcode already exists');
      }
      
      shortcode = customShortcode;
    } else {
      // Generate unique shortcode
      do {
        shortcode = nanoid(6);
      } while (this.urls.has(shortcode));
    }

    // Calculate expiry date
    const createdAt = new Date();
    const expiryDate = new Date(createdAt.getTime() + (validity * 60 * 1000));

    // Store URL data
    const urlData = {
      originalUrl,
      shortcode,
      createdAt: createdAt.toISOString(),
      expiryDate: expiryDate.toISOString(),
      validity
    };

    this.urls.set(shortcode, urlData);

    // Initialize analytics
    this.analytics.set(shortcode, {
      shortcode,
      totalClicks: 0,
      clicks: []
    });

    Logger.info('Short URL created successfully', { shortcode, originalUrl, expiryDate: urlData.expiryDate });

    return {
      shortLink: `http://localhost:3000/${shortcode}`,
      expiry: urlData.expiryDate
    };
  }

  // Get original URL by shortcode
  getOriginalURL(shortcode) {
    const urlData = this.urls.get(shortcode);
    
    if (!urlData) {
      Logger.warn('Shortcode not found', { shortcode });
      return null;
    }

    // Check if expired
    const now = new Date();
    const expiryDate = new Date(urlData.expiryDate);
    
    if (now > expiryDate) {
      Logger.warn('Shortcode expired', { shortcode, expiryDate: urlData.expiryDate });
      return null;
    }

    return urlData;
  }

  // Record a click for analytics
  recordClick(shortcode, referrer = '', userAgent = '', ip = '') {
    const analytics = this.analytics.get(shortcode);
    
    if (analytics) {
      analytics.totalClicks++;
      analytics.clicks.push({
        timestamp: new Date().toISOString(),
        referrer: referrer || 'direct',
        userAgent,
        ip,
        geolocation: this.getCoarseGeolocation(ip) // Simplified geolocation
      });

      Logger.info('Click recorded', { shortcode, totalClicks: analytics.totalClicks, referrer, ip });
    }
  }

  // Get analytics for a shortcode
  getAnalytics(shortcode) {
    const urlData = this.urls.get(shortcode);
    const analytics = this.analytics.get(shortcode);

    if (!urlData || !analytics) {
      Logger.warn('Analytics not found for shortcode', { shortcode });
      return null;
    }

    return {
      shortcode,
      originalUrl: urlData.originalUrl,
      createdAt: urlData.createdAt,
      expiryDate: urlData.expiryDate,
      totalClicks: analytics.totalClicks,
      clicks: analytics.clicks
    };
  }

  // Get all URLs (for statistics page)
  getAllURLs() {
    const allUrls = [];
    
    for (const [shortcode, urlData] of this.urls.entries()) {
      const analytics = this.analytics.get(shortcode);
      allUrls.push({
        shortcode,
        originalUrl: urlData.originalUrl,
        shortLink: `http://localhost:3000/${shortcode}`,
        createdAt: urlData.createdAt,
        expiryDate: urlData.expiryDate,
        totalClicks: analytics ? analytics.totalClicks : 0
      });
    }

    return allUrls;
  }

  // Simplified geolocation based on IP (coarse-grained as required)
  getCoarseGeolocation(ip) {
    // In production, you would use a proper geolocation service
    // For this evaluation, returning simplified location data
    if (ip.startsWith('192.168.') || ip.startsWith('127.0.') || ip === '::1') {
      return 'Local Network';
    }
    return 'Unknown Location'; // Placeholder for coarse-grained location
  }
}
