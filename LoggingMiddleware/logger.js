// Logging Middleware - MANDATORY as per requirements
export class Logger {
  static log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...metadata
    };
    console.log(JSON.stringify(logEntry));
  }

  static info(message, metadata = {}) {
    this.log('info', message, metadata);
  }

  static error(message, metadata = {}) {
    this.log('error', message, metadata);
  }

  static warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }

  static debug(message, metadata = {}) {
    this.log('debug', message, metadata);
  }
}

// Express middleware for request logging
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  Logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    Logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
};
