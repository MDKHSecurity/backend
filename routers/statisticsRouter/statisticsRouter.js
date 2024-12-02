import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";

const router = Router();

router.post("/api/statistics", authenticateToken, async (req, res) => {
  const body = req.body;
  const values = [
    [
      body.userId,
      body.roomId,
      body.courseId,
      body.totalQuestions,
      body.correctAnswers,
    ],
  ];
  const query = `
      INSERT INTO courses_statistics (user_id, room_id, course_id, total_questions, correct_answers)
      VALUES ?
    `;

  try {
    await db.connection.query(query, [values]);
    res.status(200).send({ message: "Data inserted successfully" });
  } catch (err) {
    res.status(500).send({ message: "Error inserting data" });
  }
});

router.get("/api/statistics/:institutionId",authenticateToken,async (req, res) => {
    const { institutionId } = req.params;

    try {
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

      res.status(200).json(institutionStats);
    } catch (err) {
      res.status(500).send({ error: "Database query failed" });
    }
  }
);

export default router;
