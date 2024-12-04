import jwt from "jsonwebtoken";
import db from "../../database/database.js";

const jwtSecret = process.env.JWT_SECRET;

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const jwtToken = authHeader && authHeader.split(' ')[1];
  if (!jwtToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Verify the access token
  jwt.verify(jwtToken, jwtSecret, (err, user) => {
    if (err) {
      console.log("forbidden")
      return res.status(401).json({message: 'Forbidden'});
    }

    req.user = user;
    next();
  });
}