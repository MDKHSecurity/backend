import { Router } from "express";
import { authenticateToken } from "../middleware/verifyJWT.js";
import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
import { generalRateLimiter, postRateLimiter, deleteRateLimiter } from "../middleware/rateLimit.js";
import { validateInput } from "../../utils/inputValidation/inputValidation.js";
import db from "../../database/database.js";

const router = Router();


router.get("/api/courses", authenticateToken, generalRateLimiter, async (req, res) => {
    try {
      const current_role_name = req.user.role_name
      if (current_role_name != "admin" && current_role_name != "student" && current_role_name != "owner"){
        res.status(403).send({message: 'Forbidden'})
      } 
        const [courses] = await db.connection.query("SELECT * FROM courses");

        const coursesWithDetails = await Promise.all(
            courses.map(async (course) => {

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

                return {
                    ...course,
                    videos,
                    quizzes,
                };
            })
        );
        res.send(coursesWithDetails);
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong" });
    }
});

router.get("/api/courses/:courseId", authenticateToken, generalRateLimiter, async (req, res) => {
  try {  
      const { courseId } = req.params;
      const current_role_name = req.user.role_name
      if (current_role_name != "admin" && current_role_name != "student" && current_role_name != "owner"){
        res.status(403).send({message: 'Forbidden'})
      } 
      
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
  
      res.send(courseWithDetails);
    } catch (error) {
      logErrorToFile(error, req.originalUrl);
      res.status(500).send({message: "Internal Error" });
    }
  });


router.post("/api/courses", authenticateToken, postRateLimiter, async (req, res) => {
  try {  
    const requestBody = req.body
    const { course_name, videos = [], quizzes = [] } = req.body;

    const current_role_name = req.user.role_name
    if (current_role_name != "owner"){
      res.status(403).send({message: 'Forbidden'})
    }
    
    const validation = await validateInput(req.body);
      if (!validation) {
        return res.status(400).json({ message: "Bad Request" });
      }
    if (!course_name || !Array.isArray(videos) || !Array.isArray(quizzes)) {

        return res.status(400).json({message: "Bad Request" });
    }

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

        res.send({message: `Successfully created course: ${course_name}`, newCourse});
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        await db.connection.rollback();
        res.status(500).send({message: "Something went wrong" });
    }
});

router.delete("/api/courses/:id", authenticateToken, deleteRateLimiter, async (req, res) => {
  try {
    const courseId = req.params.id;
    const current_role_name = req.user.role_name
    if (current_role_name != "owner"){
      res.status(403).send({message: 'Forbidden'})
    }

    const validation = await validateInput(req.body);
      if (!validation) {
        return res.status(400).json({ message: "Bad Request" });
      }

    
    
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

        if (result.affectedRows === 0) {
            return res.status(400).send({message: "Bad Request" });
        }
        
        res.status(200).json({ message: `Successfully deleted course`});
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        // Rollback on error
        await db.connection.rollback();
        res.status(500).json({message: "An error occurred while deleting the course" });
    }
});

export default router;