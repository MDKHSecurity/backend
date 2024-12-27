    import { Router } from "express";
    import db from "../../database/database.js";
    import { authenticateToken } from "../middleware/verifyJWT.js";
    import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
import { deleteRateLimiter, generalRateLimiter, postRateLimiter } from "../middleware/rateLimit.js";
    const router = Router();

    router.get("/api/videos", authenticateToken, generalRateLimiter, async (req, res) => {
        try {
            const current_role_name = req.user.role_name
            if (current_role_name != "admin" && current_role_name != "student" && current_role_name != "owner"){
              res.status(403).send({message: 'Forbidden'})
            } 
            const [videos] = await db.connection.query("SELECT * FROM videos");
            res.send(videos);
        } catch (error) {
            logErrorToFile(error, req.originalUrl);
            res.status(500).send({ success: false, message: "Something went wrong" });
        }
    });

    router.post("/api/videos", authenticateToken, postRateLimiter, async (req, res) => {
        const requestBody = req.body
        try {
            const current_role_name = req.user.role_name
            if (current_role_name != "owner"){
              res.status(403).send({message: 'Forbidden'})
            }

            const insertQuery = "INSERT INTO videos (video_name, file_name, length) VALUES (?, ?, ?)";
            const [video] = await db.connection.query(insertQuery, [requestBody.video_name, requestBody.file_name, requestBody.length]);
            
            const newVideo = {
                id: video.insertId,
                ...requestBody       
            };
            res.send( {message:`Successfully created video: ${requestBody.video_name}`, newVideo});
        } catch (error) {
            logErrorToFile(error, req.originalUrl);
            res.status(500).send({ success: false, message: "Something went wrong" });
        }
    });

    router.delete("/api/videos/:id", authenticateToken, deleteRateLimiter, async (req, res) => {
        const videoId = req.params.id;
        try { 
            
            const current_role_name = req.user.role_name
            if (current_role_name != "owner"){
              res.status(403).send({message: 'Forbidden'})
            } 
            const [result] = await db.connection.query(
                "DELETE FROM videos WHERE id = ?",
                [videoId]
            );
            res.json({message: `Successfully deleted video`, data: result});

        } catch (error) {
            logErrorToFile(error, req.originalUrl);
            res.status(500).send({ success: false, message: "Something went wrong" });
        }
    });

    export default router;