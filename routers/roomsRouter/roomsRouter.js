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

    const roomsWithCourses = results.map((room) => {
      return {
        id: room.room_id,
        room_name: room.room_name,
        institution_id: room.institution_id,
        courses: room.courses ? JSON.parse(`[${room.courses}]`) : [],
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

router.post("/api/rooms/courses", authenticateToken, async (req, res) => {
  const roomsCourses = req.body.assigned;
  if (!roomsCourses || roomsCourses.length === 0) {
    return res.status(400).send({ message: "error" });
  }
  const values = roomsCourses.map(({ roomId, courseId }) => [roomId, courseId]);
  const query = `
      INSERT INTO rooms_courses (room_id, course_id)
      VALUES ?
  `;
  try {
    await db.connection.query(query, [values]);
    res.status(200).send({ assigned: roomsCourses });
  } catch (err) {
    res.status(500).send({ message: "error" });
  }
});

router.delete("/api/rooms/courses", authenticateToken, async (req, res) => {
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
    res.status(200).send({ deleted: roomsCourses });
  } catch (err) {
    res.status(500).send({ message: "error" });
  }
});

router.delete("/api/rooms/:roomid", authenticateToken, async (req, res) => {
  const roomId = req.params.roomid;
  try {
    const [result] = await db.connection.query(
      "DELETE FROM rooms WHERE id = ?",
      [roomId]
    );
    res.status(200).send({ data: result });
  } catch (error) {
    res.status(500).send({ message: "error" });
  }
});

router.get("/api/courses/:courseId", async (req, res) => {
  const { courseId } = req.params; // Extract courseId from the request parameters

  try {
    // Fetch the course by its ID
    const [course] = await db.connection.query(
      "SELECT * FROM courses WHERE id = ?",
      [courseId]
    );

    // If the course doesn't exist, return a 404 error
    if (course.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const selectedCourse = course[0]; // Get the course object

    // Fetch videos associated with the course
    const [videos] = await db.connection.query(
      `
        SELECT v.* 
        FROM courses_videos cv
        INNER JOIN videos v ON cv.video_id = v.id
        WHERE cv.course_id = ?
        `,
      [courseId]
    );

    // Fetch quizzes associated with the course
    const [quizzes] = await db.connection.query(
      `
        SELECT q.* 
        FROM courses_quizzes cq
        INNER JOIN quizzes q ON cq.quiz_id = q.id
        WHERE cq.course_id = ?
        `,
      [courseId]
    );

    // For each quiz, fetch associated questions
    const quizzesWithQuestions = await Promise.all(
      quizzes.map(async (quiz) => {
        const [questions] = await db.connection.query(
          `
            SELECT qs.* 
            FROM quizzes_questions qq
            INNER JOIN questions qs ON qq.question_id = qs.id
            WHERE qq.quiz_id = ?
            `,
          [quiz.id]
        );

        return {
          ...quiz,
          questions, // Add the associated questions to the quiz
        };
      })
    );

    // Return the course along with its videos and quizzes (including questions)
    const courseWithDetails = {
      ...selectedCourse,
      videos,
      quizzes: quizzesWithQuestions,
    };

    res.status(200).json(courseWithDetails);
  } catch (error) {
    console.error("Error fetching course details:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching course details" });
  }
});

router.post("/api/courses/statistics", authenticateToken, async (req, res) => {
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
    console.error("Database Error:", err);
    res.status(500).send({ message: "Error inserting data" });
  }
});

router.get(
  "/api/courses/statistics/:institutionId",
  authenticateToken,
  async (req, res) => {
    const { institutionId } = req.params;

    const query = `
    SELECT 
        ro.institution_id,
        ro.id AS room_id, 
        ro.room_name,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'course_id', cs.course_id,
                'course_name', c.course_name,  -- Added course name from the courses table
                'total_questions', cs.total_questions,
                'correct_answers', cs.correct_answers
            )
        ) AS courses_statistics
    FROM 
        rooms ro
    LEFT JOIN (
        SELECT 
            cs.room_id,
            cs.course_id,
            SUM(cs.total_questions) AS total_questions,
            SUM(cs.correct_answers) AS correct_answers
        FROM 
            courses_statistics cs
        GROUP BY 
            cs.room_id, cs.course_id
    ) cs ON ro.id = cs.room_id
    LEFT JOIN 
        courses c ON c.id = cs.course_id  -- Added join with the courses table to get course_name
    WHERE 
        ro.institution_id = ?
    GROUP BY 
        ro.id
    ORDER BY 
        ro.id;
`;

    try {
      // Execute the query to fetch room statistics
      const [results] = await db.connection.query(query, [institutionId]);

      // Build the structure of the response
      const institutionStats = {
        institutionId: institutionId,
        rooms: results, // Directly use the results as they are already structured
      };

      res.status(200).send(institutionStats);
    } catch (err) {
      console.error(err);
      res.status(500).send({ error: "Database query failed" });
    }
  }
);

export default router;
