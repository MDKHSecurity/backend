import { Router } from "express";
import { authenticateToken } from "../middleware/verifyJWT.js";
import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
import { deleteRateLimiter, generalRateLimiter, postRateLimiter } from "../middleware/rateLimit.js";
import { validateInput } from "../../utils/inputValidation/inputValidation.js";
import db from "../../database/database.js";

const router = Router();

router.get("/api/rooms/:institutionid", authenticateToken, generalRateLimiter, async (req, res) => {
  try {
  
    const institutionId = req.params.institutionid;
    const current_role_name = req.user.role_name
    if (current_role_name != "admin"){
      res.status(403).send({message: 'Forbidden'})
    } 
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
  } catch (error) {
    logErrorToFile(error, req.originalUrl)
    res.status(500).send({message: "Internal Error" });
  }
});

//Post a single room
router.post("/api/rooms", authenticateToken, postRateLimiter, async (req, res) => {
  try {
    const body = req.body;

    const current_role_name = req.user.role_name
    if (current_role_name != "admin"){
      res.status(403).send({message: 'Forbidden'})
    }

    const validation = await validateInput(req.body);
    if (!validation) {
      return res.status(400).json({ message: "Bad Request" });
    }

    if (!body.roomName && !body.institutionId) {
      return res.status(400).send({ message: "Bad Request" });
    }

    const [existingRoom] = await db.connection.query("SELECT * FROM rooms WHERE room_name = ? AND institution_id = ?",[body.roomName, body.institutionId]);

    if (existingRoom.length > 0) {
      return res.status(409).send({ message: "Room already exists for this institution." });
    }

    const [result] = await db.connection.query("INSERT INTO rooms (room_name, institution_id) VALUES (?, ?)", [body.roomName, body.institutionId]);

    return res.send({message: `Successfully created room: ${body.roomName}`, roomName: body.roomName, roomId: result.insertId});

  } catch (error) {
    logErrorToFile(error, req.originalUrl)
    return res.status(500).send({message: "Something went wrong"});
  }
});

//Post a room and a course into the reference table rooms_courses
router.post("/api/rooms/courses", authenticateToken, postRateLimiter, async (req, res) => {
  try {
    const current_role_name = req.user.role_name
    if (current_role_name != "admin"){
      res.status(403).send({message: 'Forbidden'})
    }

    const validation = await validateInput(req.body);
    if (!validation) {
      return res.status(400).json({ message: "Bad Request" });
    }

    const roomsCourses = req.body.assigned;
    if (!roomsCourses || roomsCourses.length === 0) {
      return res.status(400).send({ message: "Bad Request" });
    }
    const values = roomsCourses.map(({ roomId, courseId }) => [roomId, courseId]);
    const query = `INSERT INTO rooms_courses (room_id, course_id) VALUES ?`;
    await db.connection.query(query, [values]);
    res.send({message:`Successfully assigned course to room`, assigned: roomsCourses});
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    res.status(500).send({ message: "Something went wrong"});
  }
});

router.delete("/api/rooms/courses", authenticateToken, deleteRateLimiter, async (req, res) => {
  try {
    const current_role_name = req.user.role_name
    if (current_role_name != "admin"){
      res.status(403).send({message: 'Forbidden'})
    } 

    const validation = await validateInput(req.body);
    if (!validation) {
      return res.status(400).json({ message: "Bad Request" });
    }

    const roomsCourses = req.body.removed;
    if (!roomsCourses) {
      return res.status(400).send({ message: "Bad Request"});
    }

    const query = `
        DELETE FROM rooms_courses
        WHERE (room_id, course_id) IN (?)
    `;

    const values = roomsCourses.map(({ roomId, courseId }) => [roomId, courseId]);

    await db.connection.query(query, [values]);
    res.send({message: `Successfully removed course from room`, deleted: roomsCourses });
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    res.status(500).send({ message: "Something went wrong" });
  }
});

router.delete("/api/rooms/:roomid", authenticateToken, deleteRateLimiter, async (req, res) => {
  try {
    const roomId = req.params.roomid;
    const current_role_name = req.user.role_name
    if (current_role_name != "admin"){
      res.status(403).send({message: 'Forbidden'})
    }

    const validation = await validateInput(req.body);
    if (!validation) {
      return res.status(400).json({ message: "Bad Request" });
    }

    const [result] = await db.connection.query("DELETE FROM rooms WHERE id = ?", [roomId]);
    res.send({message: `Successfully deleted room`, data: result});
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    res.status(500).send({ message: "Something went wrong" });
  }
});

export default router;
