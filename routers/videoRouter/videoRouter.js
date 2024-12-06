    import { Router } from "express";
    import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";
    const router = Router();

    router.get("/api/videos", authenticateToken, async (req, res) => {
        try {
            const [videos] = await db.connection.query("SELECT * FROM videos");
            res.send(videos);
        } catch (error) {
            console.error("Error fetching videos:", error);
            res.status(500).send({ success: false, message: "Internal Error" });
        }
    });

    router.post("/api/videos", authenticateToken, async (req, res) => {
        const requestBody = req.body
        try {
            const insertQuery = "INSERT INTO videos (video_name, file_name, length) VALUES (?, ?, ?)";
            const [video] = await db.connection.query(insertQuery, [requestBody.video_name, requestBody.file_name, requestBody.length]);
            
            const newVideo = {
                id: video.insertId,
                ...requestBody       
            };
            res.send(newVideo);
        } catch (error) {
            console.error("Error fetching videos:", error);
            res.status(500).send({ success: false, message: "Internal Error" });
        }
    });

    router.delete("/api/videos/:id", authenticateToken, async (req, res) => {
        const videoId = req.params.id;
        try {  
            const [result] = await db.connection.query(
                "DELETE FROM videos WHERE id = ?",
                [videoId]
            );
            res.json({data: result});

        } catch (error) {
            console.error("Error fetching videos:", error);
            res.status(500).send({ success: false, message: "Internal Error" });
        }
    });

    export default router;