import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";

const router = Router();

router.get("/api/rooms/:institutionid", authenticateToken, async (req, res) => {
  const institutionId = req.params.institutionid;

  try {
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

    const [results] = await db.connection.query(query, [institutionId]);

    const roomsWithCourses = results.map((room) => {
      return {
        id: room.room_id,
        room_name: room.room_name,
        institution_id: room.institution_id,
        courses: room.courses ? JSON.parse(`[${room.courses}]`) : [],
      };
    });
    res.send(roomsWithCourses);
  } catch (err) {
    console.error(err);
    res.status(500).send({message: "Internal Error" });
  }
});

//Post a single room
router.post("/api/rooms", authenticateToken, async (req, res) => {
  const body = req.body;

  if (!body.roomName && !body.institutionId) {
    return res.status(400).send({ message: "Bad Reqeust" });
  }

  try {
    const [existingRoom] = await db.connection.query("SELECT * FROM rooms WHERE room_name = ? AND institution_id = ?",[body.roomName, body.institutionId]);

    if (existingRoom.length > 0) {
      return res.status(409).send({ message: "Room already exists for this institution." });
    }

    const [result] = await db.connection.query("INSERT INTO rooms (room_name, institution_id) VALUES (?, ?)", [body.roomName, body.institutionId]);
    return res.send({message: "Room created", roomId: result.insertId});

  } catch (error) {
    return res.status(500).send({message: "Internal Error"});
  }
});

//Post a room and a course into the reference table rooms_courses

router.post("/api/rooms/courses", authenticateToken, async (req, res) => {
  const roomsCourses = req.body.assigned;
  if (!roomsCourses || roomsCourses.length === 0) {
    return res.status(400).send({ message: "Bad Request" });
  }
  try {
  const values = roomsCourses.map(({ roomId, courseId }) => [roomId, courseId]);
  const query = `INSERT INTO rooms_courses (room_id, course_id) VALUES ?`;
    await db.connection.query(query, [values]);
    res.send({assigned: roomsCourses});
  } catch (err) {
    res.status(500).send({ message: "Internal Error"});
  }
});

router.delete("/api/rooms/courses", authenticateToken, async (req, res) => {
  const roomsCourses = req.body.removed;
  if (!roomsCourses || roomsCourses.length === 0) {
    return res.status(400).send({ message: "Bad Request"});
  }

  try {
  const query = `
      DELETE FROM rooms_courses
      WHERE (room_id, course_id) IN (?)
  `;

  const values = roomsCourses.map(({ roomId, courseId }) => [roomId, courseId]);

    await db.connection.query(query, [values]);
    res.send({ deleted: roomsCourses });
  } catch (err) {
    res.status(500).send({ message: "Internal Error" });
  }
});

router.delete("/api/rooms/:roomid", authenticateToken, async (req, res) => {
  const roomId = req.params.roomid;
  try {
    const [result] = await db.connection.query("DELETE FROM rooms WHERE id = ?", [roomId]);
    res.send({data: result});
  } catch (error) {
    res.status(500).send({ message: "Internal Error" });
  }
});

export default router;
