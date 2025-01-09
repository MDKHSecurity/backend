import rateLimit from "express-rate-limit";

const rateLimitHandler = (req, res) => {
    res.status(429).send({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  };


// Rate limiter for POST requests
const postRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, //100 request every 15 minutes
  message: "Too many POST requests. Please try again later.",
  handler: rateLimitHandler
});

// Rate limiter for DELETE requests
const deleteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, //100 request every 15 minutes
  message: "Too many DELETE requests. Please try again later.",
  handler: rateLimitHandler
});

// General rate limiter for other routes (optional)
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, //500 request every 15 minutes
  message: "Too many requests. Please try again later.",
  handler: rateLimitHandler
});

const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, //100 request every 15 minutes
    message: "Too many requests. Please try again later.",
    handler: rateLimitHandler
  });

export { postRateLimiter, deleteRateLimiter, generalRateLimiter, loginRateLimiter };
