import { Router } from "express";
import db from "../../database/database.js";
import jwt from "jsonwebtoken";
import { findUser } from "../../utils/checks/findUsers.js";
import { hashElement } from "../../utils/passwords/hashPassword.js";
const router = Router();

const jwtSecret = process.env.JWT_SECRET;

router.post("/api/auth/refresh", async (req, res) => {

  const refreshToken = req.body.refreshToken;
  const authHeader = req.headers['authorization'];
  const jwtToken = authHeader && authHeader.split(' ')[1];

  try {
    // Verify the JWT
    jwt.verify(jwtToken, jwtSecret, async (err, user) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          if (!refreshToken) {
            // res.clearCookie("jwt", { httpOnly: true, secure: true, path: "/" })
            // res.clearCookie("refreshToken", { httpOnly: true, secure: true, path: "/" })
            return res.status(401).json({ message: "Please log in" });
          }

          try {
            const decodedRefresh = jwt.verify(refreshToken, jwtSecret);
            const query = `SELECT user_id FROM tokens WHERE user_id = ? AND token_type_id = 2`;
            const [tokens] = await db.connection.query(query, [decodedRefresh.id]);
            console.log(tokens, "auth backend token from db")
            if (tokens.length === 0) {

              console.log("in if statement empty array")
              // res.clearCookie("jwt", { httpOnly: true, secure: true, path: "/" })
              // res.clearCookie("refreshToken", { httpOnly: true, secure: true, path: "/" })
              return res.status(401).send({ message: "Please log in" });
            }
              
            // Sign new access token and refresh token
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
            res.clearCookie("jwt", { httpOnly: true, secure: true, path: "/" });
            res.clearCookie("refreshToken", {
              httpOnly: true,
              secure: true,
              path: "/",
            });

            // Set new cookies
            res.cookie("jwt", newAccessToken, { httpOnly: true, secure: true });
            res.cookie("refreshToken", newRefreshToken, {
              httpOnly: true,
              secure: true,
            });

            return res.send({ newAccessToken, newRefreshToken });
          } catch (refreshError) {
            // Log the error and send the response
            console.error("Error caught on endpoint:", req.originalUrl, "Failed to refresh token:", refreshError);
            return res.status(401).send({ message: "Please log in" });
          }
        } else {
          return res.status(401).send({ message: "Please log in" });
        }
      }

      // If the JWT token is still valid, return it as the new access token
      const newAccessToken = jwtToken;
      return res.send({ newAccessToken });
    });
  } catch (err) {
    // Catch any error that occurs within the outer try-catch block
    console.error("Error in /api/auth/refresh endpoint:", err);
    return res.status(500).send({ message: "Internal Error" });
  }
});


// ONLY FOR DEVELOPMENT. DELETE FOR PROD
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
    res.status(500).send({ message: "Internal Error" });
  }
});

router.post("/api/auth/login", async (req, res) => {
  const requestBody = req.body;
  const isPasswordValid = hashElement(requestBody.password);
  try {
    const findUserByEmail = await findUser(requestBody.email, isPasswordValid);

    if (!findUserByEmail || findUserByEmail.length === 0) {
      return res.status(401).send({ message: "The e-mail or password was incorrect. Please try again" });
    }
  
    const accessToken = jwt.sign(
      findUserByEmail,
      process.env.JWT_SECRET,
      { expiresIn: "1m" }
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

    res.cookie("jwt", accessToken, { httpOnly: true, secure: true });
    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true });

    res.send({ message: `Welcome, ${findUserByEmail.username}` }); 

  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).send({ message: "Internal Error" });
  }
});

router.get("/api/auth/logout", async (req, res) => {
  try {
    res.clearCookie("jwt", { httpOnly: true, secure: true, path: "/" });
    res.clearCookie("refreshToken", {httpOnly: true, secure: true, path: "/"});
    res.send({message: "Goodbye" });
  } catch (error) {
    res.status(500).send({ message: "Internal Error" });
  }
});

export default router;
