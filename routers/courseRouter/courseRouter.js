import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";

const router = Router();


router.get("/api/courses", async (req, res) => {
    try {
        // Query to fetch all courses
        const [courses] = await db.connection.query("SELECT * FROM courses");

        // For each course, fetch associated videos and quizzes
        const coursesWithDetails = await Promise.all(
            courses.map(async (course) => {
                // Fetch videos associated with the course
                const [videos] = await db.connection.query(
                    `
                    SELECT v.* 
                    FROM courses_videos cv
                    INNER JOIN videos v ON cv.video_id = v.id
                    WHERE cv.course_id = ?
                    `,
                    [course.id]
                );

                // Fetch quizzes associated with the course
                const [quizzes] = await db.connection.query(
                    `
                    SELECT q.* 
                    FROM courses_quizzes cq
                    INNER JOIN quizzes q ON cq.quiz_id = q.id
                    WHERE cq.course_id = ?
                    `,
                    [course.id]
                );

                // Add the associated data to the course
                return {
                    ...course,
                    videos,
                    quizzes,
                };
            })
        );
        res.status(200).json(coursesWithDetails);
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).json({ success: false, message: "Error fetching courses" });
    }
});

router.get("/api/courses/:courseId", async (req, res) => {
    const { courseId } = req.params;
  
    try {
      const [course] = await db.connection.query(
        "SELECT * FROM courses WHERE id = ?", [courseId]
      );
  
      const selectedCourse = course[0];
  
      const [videos] = await db.connection.query(
        `
          SELECT v.* 
          FROM courses_videos cv
          INNER JOIN videos v ON cv.video_id = v.id
          WHERE cv.course_id = ?
          `,
        [courseId]
      );
  
      const [quizzes] = await db.connection.query(
        `
          SELECT q.* 
          FROM courses_quizzes cq
          INNER JOIN quizzes q ON cq.quiz_id = q.id
          WHERE cq.course_id = ?
          `,
        [courseId]
      );
  
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
            questions,
          };
        })
      );
  
      const courseWithDetails = {
        ...selectedCourse,
        videos,
        quizzes: quizzesWithQuestions,
      };
  
      res.status(200).json(courseWithDetails);
    } catch (error) {
      console.error("Error fetching course details:", error);
      res.status(500).json({ success: false, message: "Error fetching course details" });
    }
  });


router.post("/api/courses", authenticateToken, async (req, res) => {
    const requestBody = req.body
    const { course_name, videos = [], quizzes = [] } = req.body;
    



    if (!course_name || !Array.isArray(videos) || !Array.isArray(quizzes)) {

        return res.status(400).json({ success: false, message: "Invalid input data" });
    }

    try {
        await db.connection.beginTransaction();

        const [courseResult] = await db.connection.query(
            "INSERT INTO courses (course_name) VALUES (?)",
            [course_name]
        );
        const courseId = courseResult.insertId;

        if (videos.length > 0) {
            const videoValues = videos.map(videoId => [courseId, videoId]);
            await db.connection.query(
                "INSERT INTO courses_videos (course_id, video_id) VALUES ?",
                [videoValues]
            );
        }

        if (quizzes.length > 0) {
            const quizValues = quizzes.map(quizId => [courseId, quizId]);
            await db.connection.query(
                "INSERT INTO courses_quizzes (course_id, quiz_id) VALUES ?",
                [quizValues]
            );
        }

        await db.connection.commit();
        const newCourse = {
            id: courseResult.insertId,
            ...requestBody       
        };

        res.status(201).json(newCourse);
    } catch (error) {
        console.error("Error creating course:", error);
        await db.connection.rollback();
        res.status(500).json({ success: false, message: "An error occurred while creating the course" });
    }
});


router.delete("/api/courses/:id", async (req, res) => {
    const courseId = req.params.id;

    try {
        // Begin transaction
        await db.connection.beginTransaction();

        // Delete associated videos
        await db.connection.query(
            "DELETE FROM courses_videos WHERE course_id = ?",
            [courseId]
        );

        // Delete associated quizzes
        await db.connection.query(
            "DELETE FROM courses_quizzes WHERE course_id = ?",
            [courseId]
        );

        // Delete the course
        const [result] = await db.connection.query(
            "DELETE FROM courses WHERE id = ?",
            [courseId]  
        );

        // Commit transaction
        await db.connection.commit();

        // Check if the course existed
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        res.status(200).json({ success: true, message: "Course deleted successfully" });
    } catch (error) {
        console.error("Error deleting course:", error);

        // Rollback on error
        await db.connection.rollback();

        res.status(500).json({ success: false, message: "An error occurred while deleting the course" });
    }
});


export default router;
