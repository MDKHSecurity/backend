import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";

const router = Router();

router.post("/api/course", authenticateToken, async (req, res) => {
    
    const { courseName, selectedVideos, selectedQuizzes } = req.body;

    
    if (!courseName || !Array.isArray(selectedVideos) || !Array.isArray(selectedQuizzes)) {
        return res.status(400).json({ success: false, message: "Invalid input data" });
    }

    try {
        
        await db.connection.beginTransaction();

        
        const [courseResult] = await db.connection.query(
            "INSERT INTO courses (course_name) VALUES (?)",
            [courseName]
        );
        const courseId = courseResult.insertId;

      
        if (selectedVideos.length > 0) {
            const videoValues = selectedVideos.map(videoId => [courseId, videoId]);
            await db.connection.query(
                "INSERT INTO courses_videos (course_id, video_id) VALUES ?",
                [videoValues]
            );
        }

        if (selectedQuizzes.length > 0) {
            const quizValues = selectedQuizzes.map(quizId => [courseId, quizId]);
            await db.connection.query(
                "INSERT INTO courses_quizzes (course_id, quiz_id) VALUES ?",
                [quizValues]
            );
        }

      
        await db.connection.commit();

        res.status(201).json({ success: true, message: "Course created successfully", courseId });
    } catch (error) {
        console.error("Error creating course:", error);
        await db.connection.rollback();

        res.status(500).json({ success: false, message: "An error occurred while creating the course" });
    }
});

export default router;
