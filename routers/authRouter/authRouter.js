import { Router } from "express";
import { findUser, findUserNoPassword } from "../../utils/checks/findUsers.js";
import { hashElement } from "../../utils/passwords/hashPassword.js";
import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
import { logLoginAttempt } from "../../utils/logLoginAttempt/logLoginAttempt.js";
import { generalRateLimiter, loginRateLimiter } from "../middleware/rateLimit.js";
import { validateInput } from "../../utils/inputValidation/inputValidation.js";
import db from "../../database/database.js";
import jwt from "jsonwebtoken";

const router = Router();

const jwtSecret = process.env.JWT_SECRET;

router.post("/api/auth/refresh", async (req, res) => {
  const refreshToken = req.body.refreshToken;
  const authHeader = req.headers['authorization'];
  const accessToken = authHeader && authHeader.split(' ')[1];

  try {
    // Verify the JWT
    jwt.verify(accessToken, jwtSecret, async (err, user) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          if (!refreshToken) {
            return res.status(401).json({ message: "We need you to login" });
          }

          try {
            const decodedRefresh = jwt.verify(refreshToken, jwtSecret);
            const query = `SELECT user_id FROM tokens WHERE user_id = ? AND token_type_id = 2`;
            const [tokens] = await db.connection.query(query, [decodedRefresh.id]);
           
            if (tokens.length === 0) {
              return res.status(401).send({ message: "We need you to login" });
            }
            
            const findUserByEmail = await findUserNoPassword(decodedRefresh.email);

            // Sign new access token and refresh token
            const newAccessToken = jwt.sign(
              findUserByEmail,
              jwtSecret,
              { expiresIn: "20m" }
            );

            const newRefreshToken = jwt.sign(
              findUserByEmail,
              jwtSecret,
              { expiresIn: "6h" }
            );

            // Update tokens in the database
            const deleteQuery = "DELETE FROM tokens WHERE user_id = ? AND token_type_id = 2";
            await db.connection.query(deleteQuery, [decodedRefresh.id]);

            const insertQuery =
              "INSERT INTO tokens (token_string, token_type_id, user_id) VALUES (?, ?, ?)";
            await db.connection.query(insertQuery, [
              newRefreshToken,
              2,
              decodedRefresh.id,
            ]);

            // Clear old cookies
            res.clearCookie("accessToken", { httpOnly: true, secure: true, path: "/" });
            res.clearCookie("refreshToken", {
              httpOnly: true,
              secure: true,
              path: "/",
            });

            // Set new cookies
            res.cookie("accessToken", newAccessToken, { httpOnly: true, secure: true });
            res.cookie("refreshToken", newRefreshToken, {httpOnly: true, secure: true,});

            return res.send({ newAccessToken, newRefreshToken });
          } catch (error) {
            logErrorToFile(error, req.originalUrl);
            return res.status(401).send({ message: "We need you to login" });
          }
        } else {
          return res.status(401).send({ message: "We need you to login" });
        }
      }
      const newAccessToken = accessToken;
      // If the JWT token is still valid, return it as the new access token
      return res.send({ newAccessToken });

    });
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    return res.status(500).send({ message: "Something went wrong" });
  }
});

router.post("/api/auth/login", loginRateLimiter, async (req, res) => {
  const validation = await validateInput(req.body);
  if (!validation) {
    return res.status(400).json({ message: "Bad Request" });
  }
  const requestBody = req.body;
  try {
    const isPasswordValid = hashElement(requestBody.password);
  
    const findUserByEmail = await findUser(requestBody.email, isPasswordValid);
    const clientIp = req.socket.remoteAddress;
    const clientPort = req.socket.remotePort;
    if (!findUserByEmail || findUserByEmail.length === 0) {
      logLoginAttempt( `Failed login attempt for email: ${requestBody.email} from IP: ${clientIp}:${clientPort}`, req.originalUrl)
      return res.status(401).send({ message: "The e-mail or password was incorrect. Please try again", isLogin: true });
    }
  
    const accessToken = jwt.sign(
      findUserByEmail,
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      findUserByEmail,
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );
    const deleteQuery = "DELETE FROM tokens WHERE user_id = ? AND token_type_id = 2";
    const [deleteTokenFromDb] = await db.connection.query(deleteQuery, [findUserByEmail.id]);

    const insertQuery ="INSERT INTO tokens (token_string, token_type_id, user_id) VALUES (?, ?, ?)";
    const [refreshTokenFromDb] = await db.connection.query(insertQuery, [refreshToken, 2,findUserByEmail.id]);

    res.cookie("accessToken", accessToken, { httpOnly: true, secure: true });
    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true });

    res.send({ message: `Welcome, ${findUserByEmail.username}` }); 
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    res.status(500).send({ message: "Something went wrong" });
  }
});

router.get("/api/auth/logout", generalRateLimiter, async (req, res) => {
  const validation = await validateInput(req.body);
  if (!validation) {
    return res.status(400).json({ message: "Bad Request" });
  }
  try {
    res.clearCookie("accessToken", { httpOnly: true, secure: true, path: "/" });
    res.clearCookie("refreshToken", {httpOnly: true, secure: true, path: "/"});
    res.send({message: "Goodbye" });
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    res.status(500).send({ message: "Something went wrong" });
  }
});

export default router;
