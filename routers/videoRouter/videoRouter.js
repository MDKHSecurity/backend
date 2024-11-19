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

export default router;