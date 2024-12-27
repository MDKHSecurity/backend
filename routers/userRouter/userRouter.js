import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken} from "../middleware/verifyJWT.js";
const router = Router();
import { sendMail } from "../../utils/mails/mailing.js";
import { hashElement } from "../../utils/passwords/hashPassword.js"
import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
import crypto from "crypto";
import { deleteRateLimiter, generalRateLimiter, postRateLimiter } from "../middleware/rateLimit.js";

router.get("/api/users", authenticateToken, generalRateLimiter, async (req, res) => {
  const user = req.user;
  try {
    if (!user){
      res.status(403).send({message: 'Forbidden'})
    }
    res.send(user);
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    res.status(500).send({ message: "Something went wrong" });
  }
});

router.get("/api/users/rooms", authenticateToken, generalRateLimiter, async (req, res) => {
  const user = req.user;
  try {
    const current_role_name = req.user.role_name
    if (!current_role_name){
      res.status(403).send({message: 'Forbidden'})
    }

    // Step 1: Fetch basic user information
    const [users] = await db.connection.query(
      `
      SELECT 
          u.id, 
          u.username, 
          u.institution_id,
          u.email,
          r.role_name
      FROM 
          users u
      JOIN 
          roles r ON u.role_id = r.id
      WHERE 
          u.id = ?
      `,
      [user.id]
    );

    const userInfo = users[0];

    const [rooms] = await db.connection.query(
      `
      SELECT 
          ro.id, 
          ro.room_name
      FROM 
          users_rooms ur
      JOIN 
          rooms ro ON ur.room_id = ro.id
      WHERE 
          ur.user_id = ?
      `,
      [userInfo.id]
    );

    const roomsWithCourses = await Promise.all(
      rooms.map(async (room) => {
        const [courses] = await db.connection.query(
          `
          SELECT 
              c.id, 
              c.course_name
          FROM 
              rooms_courses rc
          JOIN 
              courses c ON rc.course_id = c.id
          WHERE 
              rc.room_id = ?
          `,
          [room.id]
        );

        return {
          ...room,
          courses,
        };
      })
    );

    const response = {
      ...userInfo,
      rooms: roomsWithCourses,
    };

    res.send(response);
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    res.status(500).send({ message: "Something went wrong" });
  }
});


//Gets all users on instution and their assigned rooms
router.get("/api/users/:institutionid", authenticateToken, generalRateLimiter, async (req, res) => {
  const institutionId = req.params.institutionid;

  try {

    const current_role_name = req.user.role_name
    if (current_role_name != "owner" && current_role_name != "admin"){
      res.status(403).send({message: 'Forbidden'})
    } 

  const query = `
    SELECT 
        u.id,
        u.username,
        u.institution_id,
        i.institution_name,
        GROUP_CONCAT(JSON_OBJECT('id', ro.id, 'name', ro.room_name)) AS rooms
    FROM 
        users u
    LEFT JOIN 
        users_rooms ur ON u.id = ur.user_id
    LEFT JOIN 
        rooms ro ON ur.room_id = ro.id
    JOIN 
        institutions i ON u.institution_id = i.id
    WHERE 
        u.institution_id = ?
    GROUP BY 
        u.id;
    `;

    const [results] = await db.connection.query(query, [institutionId]);


    const usersWithRooms = results.map((user) => {
      const userInfo = {
        ...user,
        rooms: JSON.parse(`[${user.rooms}]`),
      };
      return userInfo;
    });
    res.send(usersWithRooms);
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    res.status(500).send({ message: "Something went wrong" });
  }
});



router.post("/api/users/rooms", authenticateToken, postRateLimiter, async (req, res) => {

  const current_role_name = req.user.role_name
  if (current_role_name != "admin"){
    res.status(403).send({message: 'Forbidden'})
  } 

  const usersRooms = req.body.assigned;
  try {
  if (!usersRooms || usersRooms.length === 0) {
    return res.status(400).send({ message: "Bad Reqeust" });
  }

  const values = usersRooms.map(({ userId, roomId }) => [userId, roomId]);
  const query = `
  INSERT INTO users_rooms (user_id, room_id) 
  VALUES ? 
  ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), room_id = VALUES(room_id);
  `;
    await db.connection.query(query, [values]);
    res.status(200).send({message:`Successfully assigned users to room`, assigned: usersRooms });
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    res.status(500).send({ message: "Something went wrong" });
  }
});


router.post("/api/users", authenticateToken, postRateLimiter, async (req, res) => {
    try {

      const current_role_name = req.user.role_name
      if (current_role_name != "owner"){
        res.status(403).send({message: 'Forbidden'})
      } 
        const { institutionId, users} = req.body;

        // Map users into an array of values for insertion
        const userEntries = users.map(user => {
            const emailPrefix = user.email.split('@')[0];
            const randomDigits = Math.floor(1000 + Math.random() * 9000);
            const username = `${emailPrefix}${randomDigits}`;
            return [username, institutionId, user.role_id, user.email];
        });

        // Insert users in bulk into the database
        const insertUsersQuery = `
            INSERT INTO users (username, institution_id, role_id, email) 
            VALUES ?`;
        const [result] = await db.connection.query(insertUsersQuery, [userEntries]);

        // Generate tokens for the inserted users
        const insertedUserIds = Array.from({ length: result.affectedRows }, (_, i) => result.insertId + i);
        const tokenEntries = insertedUserIds.map(userId => {
            const token = crypto.randomBytes(20).toString("hex"); // Generate unique token
            const  hash  = hashElement(token); // Hash the token securely
            console.log(hash, "<-- Hashuing")
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token valid for 24 hours
            const tokenTypeId = 3; // Assuming 3 is the type ID for verification tokens
            return {
                userId,
                hash, // Hash for database
                plainToken: token, // Plain token for email
                expiresAt,
                tokenTypeId,
            };
        });

        // Prepare database entries
        const dbTokenEntries = tokenEntries.map(({ userId, hash, tokenTypeId, expiresAt }) => [
            userId, hash, tokenTypeId, expiresAt,
        ]);

        // Insert tokens into the tokens table
        const insertTokensQuery = `
            INSERT INTO tokens (user_id, token_string, token_type_id, expires_at) 
            VALUES ?`;
        await db.connection.query(insertTokensQuery, [dbTokenEntries]);

        // Send verification emails to all users
        const emailPromises = userEntries.map(([, , , email], index) => {
            const token = tokenEntries[index].plainToken; // Retrieve the plain token for the email
            const verificationLink = `https://localhost:5173/verify?token=${token}`;
            const emailContent = `
                <p>Hi,</p>
                <p>Thank you for registering. Please verify your email by clicking the link below:</p>
                <a href="${verificationLink}">Verify Email</a>
                <p>This link will expire in 24 hours.</p>
            `;

            // Send email to the user using the sendMail function
            return sendMail("Verify Your Email", emailContent, [email]); // Pass the user's email as an array
        });

        // Wait for all email sending promises to complete
        await Promise.all(emailPromises);

        res.send({message: `${users.length} users added successfully. Verification emails sent.`,
        });
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong" });
    }
});


router.patch('/api/users/:id', postRateLimiter, async (req, res) => {
  const password = req.body.password;
  const user_id = req.params.id;    

  try {
      const hash  = hashElement(password);
      const query = `UPDATE users SET password = ? WHERE id = ?`;
      const [result] = await db.connection.query(query, [hash, user_id]);

      res.status(200).send({message:`Password updated. Please login`, result});
  } catch (error) {
      logErrorToFile(error, req.originalUrl);
      res.status(500).send({ message: "Something went wrong" });
  }
});

router.delete('/api/users/rooms', authenticateToken, deleteRateLimiter, async (req, res) => {

  const current_role_name = req.user.role_name
  if (current_role_name != "admin"){
    res.status(403).send({message: 'Forbidden'})
  } 
    const usersRooms = req.body.removed;
    if (!usersRooms || usersRooms.length === 0) {
        return res.status(400).send({ message: "Bad Request" });
    }

    const query = `
        DELETE FROM users_rooms
        WHERE (user_id, room_id) IN (?)
    `;

  const values = usersRooms.map(({ userId, roomId }) => [userId, roomId]);

  try {
    await db.connection.query(query, [values]);
    res.send({message: `Successfully removed users from the room`, deleted: usersRooms });
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    res.status(500).send({ message: "Something went wrong" });
  }
});

router.delete("/api/users/:id", authenticateToken, async (req, res) => {

  const current_role_name = req.user.role_name
  if (current_role_name != "owner"){
    res.status(403).send({message: 'Forbidden'})
  } 
  const userId = req.params.id;
  try {  
      const [result] = await db.connection.query(
        // "DELETE FROM tokens WHERE token_type_id = 2 AND id = ?",
          "DELETE FROM users WHERE id = ?",
          [userId]
      );
 
      res.json({message: `Successfully deleted user`, data: result});
 
  } catch (error) {
      logErrorToFile(error, req.originalUrl);
      res.status(500).send({ success: false, message: "Something went wrong" });
  }
});

export default router;

