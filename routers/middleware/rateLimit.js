import rateLimit from "express-rate-limit";

const rateLimitHandler = (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  };


// Rate limiter for POST requests
const postRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 POST requests per 15 minutes
  message: "Too many POST requests. Please try again later.",
  
});

// Rate limiter for DELETE requests
const deleteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 DELETE requests per 15 minutes
  message: "Too many DELETE requests. Please try again later.",
});

// General rate limiter for other routes (optional)
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: "Too many requests. Please try again later.",
});

const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 100 requests per 15 minutes
    message: "Too many requests. Please try again later.",
    handler: rateLimitHandler
  });

export { postRateLimiter, deleteRateLimiter, generalRateLimiter, loginRateLimiter };
