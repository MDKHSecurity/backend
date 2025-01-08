import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(' ')[1];

    jwt.verify(accessToken, jwtSecret, (err, user) => {
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
