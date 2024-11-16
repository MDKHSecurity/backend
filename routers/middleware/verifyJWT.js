import jwt from "jsonwebtoken";
const jwtSecret = process.env.JWT_SECRET


export function authenticateToken(req, res, next) {

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({message: 'Unauthorized'});
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
    //   if (err.name === 'TokenExpiredError') {
    //     if (req.url === '/api/auth/login' || req.url === '/api/auth/logout') {
    //       return next();
    //     }
    //     return next();
    //   }
      return res.status(401).json({message: 'Forbidden'});
    }

    req.user = user;
    next();
  });
}