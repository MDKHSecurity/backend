import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";

const router = Router();

router.post("/api/statistics", authenticateToken, async (req, res) => {
  const body = req.body;
  try {
  const values = [
    [
      body.userId,
      body.roomId,
      body.courseId,
      body.totalQuestions,
      body.correctAnswers,
    ],
  ];
  const query = `INSERT INTO courses_statistics (user_id, room_id, course_id, total_questions, correct_answers) VALUES ?`;

    await db.connection.query(query, [values]);
    res.send({message: "Success"});
  } catch (err) {
    res.status(500).send({ message: "Internal Error" });
  }
});

router.get("/api/statistics/:institutionId", authenticateToken, async (req, res) => {
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

      res.send(institutionStats);
    } catch (err) {
      res.status(500).send({message: "Internal Error"});
    }
  }
);

export default router;
