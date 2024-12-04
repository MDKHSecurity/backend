import { Router } from "express";
import pbkdf2 from "pbkdf2";
import db from "../../database/database.js";
import jwt from "jsonwebtoken";
import { findUser } from "../../utils/checks/findUsers.js";
import { hashElement, verifyPassword} from "../../utils/passwords/hashPassword.js";
const router = Router();

const jwtSecret = process.env.JWT_SECRET;

router.post("/api/auth/refresh", async (req, res) => {
  const refreshToken = req.body.refreshToken;
  const authHeader = req.headers['authorization'];
  const jwtToken = authHeader && authHeader.split(' ')[1];
  let newAccessToken = null;
  // Verify the JWT
  jwt.verify(jwtToken, jwtSecret, async (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        console.log("Access token expired. Checking for refresh token...");
        if (!refreshToken) {
          return res
            .status(401)
            .json({ message: "Session expired. Please log in again." });
        }

        try {
          const decodedRefresh = jwt.verify(refreshToken, jwtSecret);
          const query = `SELECT user_id FROM tokens WHERE user_id = ? AND token_type_id = 2`;
          const [tokens] = await db.connection.query(query, [decodedRefresh.id]);

          if (tokens.length === 0) {
            return res.status(403).json({ message: "Invalid refresh token. Please log in again." });
          }

          // Create new tokens
          const newAccessToken = jwt.sign(
            {
              id: decodedRefresh.id,
              username: decodedRefresh.username,
              email: decodedRefresh.email,
              institution_id: decodedRefresh.institution_id,
              role_name: decodedRefresh.role_name,
              isLoggedIn: decodedRefresh.isLoggedIn,
            },
            jwtSecret,
            { expiresIn: "1m" }
          );

          const newRefreshToken = jwt.sign(
            {
              id: decodedRefresh.id,
              username: decodedRefresh.username,
              email: decodedRefresh.email,
              institution_id: decodedRefresh.institution_id,
              role_name: decodedRefresh.role_name,
              isLoggedIn: decodedRefresh.isLoggedIn,
            },
            jwtSecret,
            { expiresIn: "1d" }
          );

          // Update tokens in database
          const deleteQuery =
            "DELETE FROM tokens WHERE user_id = ? AND token_type_id = 2";
          await db.connection.query(deleteQuery, [decodedRefresh.id]);

          const insertQuery =
            "INSERT INTO tokens (token_string, token_type_id, user_id) VALUES (?, ?, ?)";
          await db.connection.query(insertQuery, [
            newRefreshToken,
            2,
            decodedRefresh.id,
          ]);

          res.clearCookie("jwt", { httpOnly: true, secure: true, path: "/" });
          res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: true,
            path: "/",
          });

          res.cookie("jwt", newAccessToken, { httpOnly: true, secure: true });
          res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: true,
          });
          
          // Send success response
          return res.send({message: "Tokens refreshed successfully.", newAccessToken, newRefreshToken});
        } catch (refreshError) {
          console.error("Failed to refresh token:", refreshError);
          return res
            .status(401)
            .json({ message: "Session expired. Please log in again." }); // Return immediately
        }
      } else {
        return res.status(401).json({ message: "Unauthorized" }); // Return immediately
      }
    }
    newAccessToken = jwtToken;
    console.log("Token not expired");
    return res.send({ message: "Token is still valid.", newAccessToken});
  });
});

router.post("/api/auth/register", async (req, res) => {
  const requestBody = req.body;

  const findUserByUsername = await findUser(requestBody.email);
  if (findUserByUsername.length === 0) {
    const { hash } = hashElement(requestBody.password);
    const insertQuery =
      "INSERT INTO users (username, password, institution_id, role_id, email) VALUES (?, ?, ?, ?, ?)";
    const [registeredUser] = await db.connection.query(insertQuery, [
      requestBody.username,
      hash,
      requestBody.institution,
      requestBody.role_id,
      requestBody.email,
    ]);
    res.status(200).json({ success: true, data: registeredUser });
  } else {
    res.status(500).send({ message: "failed" });
  }
});

router.post("/api/auth/login", async (req, res) => {
  const requestBody = req.body;

  try {
    const findUserByEmail = await findUser(requestBody.email);

    if (!findUserByEmail || Object.keys(findUserByEmail).length === 0) {
      return res.status(500).send({ message: "failed" });
    }

    const isPasswordValid = verifyPassword(
      requestBody.password,
      findUserByEmail.password
    );
    if (!isPasswordValid) {
      return res.status(400).send({ message: "invalid credentials" });
    }
    // Exclude the password from the JWT payload
    const { password, ...userWithoutPassword } = findUserByEmail;
    userWithoutPassword.isLoggedIn = true;
    const accessToken = jwt.sign(
      userWithoutPassword,
      process.env.JWT_SECRET,
      { expiresIn: "1m" }
    );
    const refreshToken = jwt.sign(
      userWithoutPassword,
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    const deleteQuery =
      "DELETE FROM tokens WHERE user_id = ? AND token_type_id = 2";
    const [deleteTokenFromDb] = await db.connection.query(deleteQuery, [
      findUserByEmail.id,
    ]);

    const insertQuery =
      "INSERT INTO tokens (token_string, token_type_id, user_id) VALUES (?, ?, ?)";
    const [refreshTokenFromDb] = await db.connection.query(insertQuery, [
      refreshToken,
      2,
      findUserByEmail.id,
    ]);
    res.cookie("jwt", accessToken, { httpOnly: true, secure: true });
    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true });
    res.status(200).send({ message: "Success" });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).send({ message: "Server error" });
  }
});

router.get("/api/auth/logout", async (req, res) => {
  try {
    // Clear the authentication cookies
    res.clearCookie("jwt", { httpOnly: true, secure: true, path: "/" });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      path: "/",
    });

    res.status(200).send({ message: "User logged out successfully" });
  } catch (error) {
    res.status(500).send({ message: "An error occurred" });
  }
});

export default router;
