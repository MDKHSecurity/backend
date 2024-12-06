import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken} from "../middleware/verifyJWT.js";
const router = Router();
import { sendMail } from "../../utils/mails/mailing.js"; // Import the sendMail function
import { hashElement } from "../../utils/passwords/hashPassword.js"
import crypto from "crypto";

router.get("/api/users", authenticateToken, async (req, res) => {
  const user = req.user;
  try {
    res.send(user);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal Error" });
  }
});

router.get("/api/users/rooms", authenticateToken, async (req, res) => {
  console.log("In rooms api")
  const user = req.user;
  console.log(user, "This is loggedin user")
  try {
    const query = `
        SELECT 
            u.id, 
            u.username,
            u.institution_id,
            u.email,
            u.password,
            i.institution_name,
            r.role_name,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', ro.id, 
                    'name', ro.room_name, 
                    'courses', (
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT('id', c.id, 'name', c.course_name)
                        )
                        FROM rooms_courses rc
                        JOIN courses c ON rc.course_id = c.id
                        WHERE rc.room_id = ro.id
                    )
                )
            ) AS rooms
        FROM 
            users u
        LEFT JOIN 
            users_rooms ur ON u.id = ur.user_id
        LEFT JOIN 
            rooms ro ON ur.room_id = ro.id
        JOIN 
            institutions i ON u.institution_id = i.id
        JOIN 
            roles r ON u.role_id = r.id
        WHERE 
            u.email = ?
        GROUP BY 
            u.id;
    `;

    
        const [result] = await db.connection.query(query, [user.email]);
        console.log("This is result from DB --->", result)
        
        if (!result || result.length === 0) {
            return []; // Return null or a default value
        }
        const userInfo = {
            ...result[0],
            rooms: result[0].rooms // Parse JSON or provide default
        };

        console.log("This is the data we send", userInfo)
    res.send(userInfo);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal Error" });
  }
});

//Gets all users on instution and their assigned rooms
router.get("/api/users/:institutionid", authenticateToken, async (req, res) => {
  const institutionId = req.params.institutionid;

  try {
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
  } catch (err) {
    res.status(500).send({ message: "Internal Error" });
  }
});



router.post("/api/users/rooms", authenticateToken, async (req, res) => {
  const usersRooms = req.body.assigned;
  try {
  if (!usersRooms || usersRooms.length === 0) {
    return res.status(400).send({ message: "Bad Reqeust" });
  }
  const values = usersRooms.map(({ userId, roomId }) => [userId, roomId]);
  const query = `INSERT INTO users_rooms (user_id, room_id) VALUES ?`;
    await db.connection.query(query, [values]);
    res.status(200).send({ assigned: usersRooms });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal Error" });
  }
});


router.post("/api/users", authenticateToken, async (req, res) => {
    try {
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
            const verificationLink = `http://localhost:5173/verify?token=${token}`;
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
        console.error("Error inserting users or sending emails:", error);
        res.status(500).send({message: "Internal Error" });
    }
});


router.patch('/api/users/:id', async (req, res) => {
  const password = req.body.password;
  const user_id = req.params.id;    

  try {
      const hash  = hashElement(password);
      const query = `UPDATE users SET password = ? WHERE id = ?`;
      const [result] = await db.connection.query(query, [hash, user_id]);

      res.status(200).send(result);
  } catch (error) {
      console.error("Error updating password for user:", user_id, error);
      res.status(500).send({ message: "Internal Error" });
  }
});

router.delete('/api/users/rooms', authenticateToken, async (req, res) => {
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
    res.send({ deleted: usersRooms });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal Error" });
  }
});

export default router;

