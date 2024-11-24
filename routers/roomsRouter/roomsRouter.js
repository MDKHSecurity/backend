import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";

const router = Router();


router.get("/api/rooms/:institutionid", authenticateToken, async (req, res) => {
  const institutionId = req.params.institutionid;

  const query = `
  SELECT 
      ro.id AS room_id,
      ro.room_name,
      ro.institution_id,
      GROUP_CONCAT(JSON_OBJECT('id', c.id, 'course_name', c.course_name)) AS courses
  FROM 
      rooms ro
  LEFT JOIN 
      rooms_courses rc ON ro.id = rc.room_id
  LEFT JOIN 
      courses c ON rc.course_id = c.id
  WHERE 
      ro.institution_id = ?
  GROUP BY 
      ro.id;
  `;

  try {
      const [results] = await db.connection.query(query, [institutionId]);

      const roomsWithCourses = results.map(room => {
          return {
              id: room.room_id,
              room_name: room.room_name,
              institution_id: room.institution_id,
              courses: room.courses ? JSON.parse(`[${room.courses}]`) : []
          };
      });
      
      res.status(200).send(roomsWithCourses);
  } catch (err) {
      console.error(err);
      res.status(500).send({ error: "Database query failed" });
  }
});

router.post("/api/room", authenticateToken, async (req, res) => {
  const body = req.body;

  if (!body.roomName && !body.institutionId) {
    return res
      .status(400)
      .send({ message: "Room name and institution ID are required." });
  }

  try {
    const [existingRoom] = await db.connection.query(
      "SELECT * FROM rooms WHERE room_name = ? AND institution_id = ?",
      [body.roomName, body.institutionId]
    );

    if (existingRoom.length > 0) {
      return res
        .status(409)
        .send({ message: "Room already exists for this institution." });
    }

    const [result] = await db.connection.query(
      "INSERT INTO rooms (room_name, institution_id) VALUES (?, ?)",
      [body.roomName, body.institutionId]
    );

    return res.status(201).send({
      message: "Room created",
      roomId: result.insertId,
    });
  } catch (error) {
    return res.status(500).send({ message: "error" });
  }
});

router.post('/api/rooms/courses', authenticateToken, async (req, res) => {
  const roomsCourses = req.body.assigned;
  if (!roomsCourses || roomsCourses.length === 0) {
      return res.status(400).send({message: "error"});
  }
  const values = roomsCourses.map(({ roomId, courseId }) => [roomId, courseId]);
  const query = `
      INSERT INTO rooms_courses (room_id, course_id)
      VALUES ?
  `;
  try {
      await db.connection.query(query, [values]);
      res.status(200).send({ assigned: roomsCourses});
  } catch (err) {
      res.status(500).send({ message: "error" });
  }
});


router.delete('/api/rooms/courses', authenticateToken, async (req, res) => {
  const roomsCourses = req.body.removed;
  if (!roomsCourses || roomsCourses.length === 0) {
      return res.status(400).send({ message: "error" });
  }

  const query = `
      DELETE FROM rooms_courses
      WHERE (room_id, course_id) IN (?)
  `;

  const values = roomsCourses.map(({ roomId, courseId }) => [roomId, courseId]);

  try {
      await db.connection.query(query, [values]);
      res.status(200).send({ deleted: roomsCourses});
  } catch (err) {
      res.status(500).send({ message: "error" });
  }
});

export default router;