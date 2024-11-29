import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";

const router = Router();

router.get("/api/users", authenticateToken, async (req, res) => {
  const user = req.user;
  try {
    res.status(200).send(user);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "error" });
  }
});

router.get("/api/user", authenticateToken, async (req, res) => {
    const user = req.user;
    const query = `
      SELECT 
          u.id, 
          u.username,
          u.institution_id,
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
          u.username = ?
      GROUP BY 
          u.id;
    `;
  
    try {
      const [result] = await db.connection.query(query, [user.username]);
      if (!result[0]) {
        return res.status(404).send({ error: "User not found" });
      }
  
      const userInfo = {
        ...result[0],
        rooms: result[0].rooms,
      };
      res.status(200).send(userInfo);
    } catch (err) {
      console.error(err);
      res.status(500).send({ error: "Database query failed" });
    }
  });

//Gets all users on instution and their assigned rooms
router.get("/api/users/:institutionid", authenticateToken, async (req, res) => {
  const institutionId = req.params.institutionid;

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

  try {
    const [results] = await db.connection.query(query, [institutionId]);

    const usersWithRooms = results.map((user) => {
      const userInfo = {
        ...user,
        rooms: JSON.parse(`[${user.rooms}]`),
      };
      return userInfo;
    });
    res.status(200).send(usersWithRooms);
  } catch (err) {
    res.status(500).send({ error: "error" });
  }
});

router.post("/api/users/rooms", authenticateToken, async (req, res) => {
  const usersRooms = req.body.assigned;
  if (!usersRooms || usersRooms.length === 0) {
    return res.status(400).send({ message: "error" });
  }
  const values = usersRooms.map(({ userId, roomId }) => [userId, roomId]);
  const query = `
        INSERT INTO users_rooms (user_id, room_id)
        VALUES ?
    `;
  try {
    await db.connection.query(query, [values]);
    res.status(200).send({ assigned: usersRooms });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "error" });
  }
});

router.delete("/api/users/rooms", authenticateToken, async (req, res) => {
  const usersRooms = req.body.removed;
  if (!usersRooms || usersRooms.length === 0) {
    return res.status(400).send({ message: "No usersRooms provided" });
  }

  const query = `
        DELETE FROM users_rooms
        WHERE (user_id, room_id) IN (?)
    `;

  const values = usersRooms.map(({ userId, roomId }) => [userId, roomId]);

  try {
    await db.connection.query(query, [values]);
    res.status(200).send({ deleted: usersRooms });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to remove users from rooms" });
  }
});

router.post("/api/users", async (req, res) => {
  const requestBody = req.body;
  try {
    const insertQuery =
      "INSERT INTO users (video_name, file_name, length) VALUES (?, ?, ?)";
    const [video] = await db.connection.query(insertQuery, [
      requestBody.video_name,
      requestBody.file_name,
      requestBody.length,
    ]);
    res.status(200).json(video);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ success: false, message: "Error fetching videos" });
  }
});
export default router;
