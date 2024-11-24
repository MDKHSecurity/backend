    import { Router } from "express";
    import db from "../../database/database.js";
    const router = Router();

    router.get("/api/videos", async (req, res) => {
        try {
            const [videos] = await db.connection.query("SELECT * FROM videos");
            res.status(200).json(videos);
        } catch (error) {
            console.error("Error fetching videos:", error);
            res.status(500).json({ success: false, message: "Error fetching videos" });
        }
    });

    router.post("/api/videos", async (req, res) => {
        const requestBody = req.body
        try {
            const insertQuery = "INSERT INTO videos (video_name, file_name, length) VALUES (?, ?, ?)";
            const [video] = await db.connection.query(insertQuery, [requestBody.video_name, requestBody.file_name, requestBody.length]);
            
            const newVideo = {
                id: video.insertId,
                ...requestBody       
            };
            res.status(200).json(newVideo);
        } catch (error) {
            console.error("Error fetching videos:", error);
            res.status(500).json({ success: false, message: "Error fetching videos" });
        }
    });

    router.delete("/api/videos/:id", async (req, res) => {
        const videoId = req.params.id;
        try {  
            const [video] = await db.connection.query(
                "DELETE FROM videos WHERE id = ?",
                [videoId]
            );
            res.status(200).json({message: "deleted"});
        } catch (error) {
            console.error("Error fetching videos:", error);
            res.status(500).json({ success: false, message: "Error fetching videos" });
        }
    });

    export default router;