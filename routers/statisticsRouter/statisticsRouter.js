import { Router } from "express";
import { authenticateToken } from "../middleware/verifyJWT.js";
import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
import { generalRateLimiter, postRateLimiter } from "../middleware/rateLimit.js";
import { validateInput } from "../../utils/inputValidation/inputValidation.js";
import db from "../../database/database.js";

const router = Router();

//Gets the statistics for an institution
//Its the summed value of questions and correct answers
router.get("/api/statistics/:institutionId", authenticateToken, generalRateLimiter, async (req, res) => {
  try {
    const { institutionId } = req.params;

    const current_role_name = req.user.role_name
    if (current_role_name != "admin"){
      res.status(403).send({message: 'Forbidden'})
    } 
    const [rooms] = await db.connection.query(
      "SELECT id AS room_id, room_name FROM rooms WHERE institution_id = ? ORDER BY id",
      [institutionId]
    );

    const roomIds = rooms.map((room) => room.room_id);
    const [statistics] = await db.connection.query(
      `
      SELECT 
        cs.room_id,
        cs.course_id,
        c.course_name,
        SUM(cs.total_questions) AS total_questions,
        SUM(cs.correct_answers) AS correct_answers
      FROM 
        courses_statistics cs
      INNER JOIN 
        courses c ON c.id = cs.course_id
      WHERE 
        cs.room_id IN (?)
      GROUP BY 
        cs.room_id, cs.course_id
      `,
      [roomIds]
    );

    const roomsWithStatistics = rooms.map((room) => ({
      ...room,
      courses_statistics: statistics.filter(
        (stat) => stat.room_id === room.room_id
      ),
    }));

    const institutionStats = {
      institutionId,
      rooms: roomsWithStatistics,
    };

    res.send(institutionStats);
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    res.status(500).send({message: "Something went wrong"});
  }
}
);

//When a user submits a course the answer will be added to the statistics table in the DB
router.post("/api/statistics", authenticateToken, postRateLimiter, async (req, res) => {
  try {
    const body = req.body;
    const current_role_name = req.user.role_name
    if (current_role_name != "admin" && current_role_name != "student" && current_role_name != "owner"){
      res.status(403).send({message: 'Forbidden'})
    }

    const validation = await validateInput(req.body);
    if (!validation) {
      return res.status(400).json({ message: "Bad Request" });
    }

    const { userId, roomId, courseId, totalQuestions, correctAnswers } = body;

    const checkQuery = `
      SELECT * FROM courses_statistics 
      WHERE user_id = ? AND room_id = ? AND course_id = ?`;
    const [existingRows] = await db.connection.query(checkQuery, [userId, roomId, courseId]);

    if (existingRows.length > 0) {
      return res.send({ message: "Course have been completed" });
    }

    const insertQuery = `
      INSERT INTO courses_statistics (user_id, room_id, course_id, total_questions, correct_answers) 
      VALUES (?, ?, ?, ?, ?)`;
    await db.connection.query(insertQuery, [userId, roomId, courseId, totalQuestions, correctAnswers]);

    res.send({ message: "Course have been completed" });
  } catch (error) {
    logErrorToFile(error, req.originalUrl);
    res.status(500).send({ message: "Something went wrong" });
  }
});

export default router;
