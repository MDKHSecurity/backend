import jwt from "jsonwebtoken";
import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
const jwtSecret = process.env.JWT_SECRET;

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const jwtToken = authHeader && authHeader.split(' ')[1];
  try {
    // Verify the access token
    jwt.verify(jwtToken, jwtSecret, (err, user) => {
      if (err) {
        return res.status(401).send({invalid: true, message: 'We need you to login' });
      }
      req.user = user;
      next();
    });

  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    return res.status(500).send({ message: "Something went wrong" });
  }
}
