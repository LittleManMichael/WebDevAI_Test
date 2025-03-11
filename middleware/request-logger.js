// middleware/request-logger.js

/**
 * Request Logger Middleware
 * 
 * Logs information about incoming HTTP requests for development and debugging purposes.
 * This can be extended to support production logging by integrating with systems like 
 * Winston, Bunyan, or other logging services.
 */
const requestLogger = (req, res, next) => {
  // Capture the start time of the request
  const start = Date.now();
  
  // Create a unique ID for this request (useful for tracking requests in logs)
  req.requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  
  // Log basic request details
  console.log(`[${new Date().toISOString()}] ${req.requestId} - ${req.method} ${req.originalUrl}`);
  
  // Log request headers if in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    // Log request body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      // Avoid logging sensitive information in body
      const sanitizedBody = { ...req.body };
      
      // Remove sensitive fields (add more as needed)
      if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
      if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
      if (sanitizedBody.apiKey) sanitizedBody.apiKey = '[REDACTED]';
      
      console.log('Body:', JSON.stringify(sanitizedBody, null, 2));
    }
  }
  
  // Capture response data
  const originalSend = res.send;
  res.send = function(body) {
    // Log the response when complete
    res.responseBody = body;
    originalSend.apply(res, arguments);
  };
  
  // When the response is finished
  res.on('finish', () => {
    // Calculate request duration
    const duration = Date.now() - start;
    
    // Log the status code, duration, and basic response info
    console.log(`[${new Date().toISOString()}] ${req.requestId} - Completed ${res.statusCode} in ${duration}ms`);
    
    // Log response body in development mode (but limit its size)
    if (process.env.NODE_ENV === 'development' && res.responseBody) {
      let responsePreview;
      
      if (typeof res.responseBody === 'string') {
        // For string responses, limit the preview length
        responsePreview = res.responseBody.length > 500 
          ? `${res.responseBody.substring(0, 500)}... [truncated]` 
          : res.responseBody;
      } else {
        // For object responses, stringify with limits
        try {
          const parsed = JSON.parse(res.responseBody);
          responsePreview = JSON.stringify(parsed, null, 2);
          
          if (responsePreview.length > 500) {
            responsePreview = `${responsePreview.substring(0, 500)}... [truncated]`;
          }
        } catch (e) {
          responsePreview = '[Unable to parse response body]';
        }
      }
      
      console.log(`Response preview: ${responsePreview}`);
    }
  });
  
  // Continue to the next middleware
  next();
};

module.exports = requestLogger;
