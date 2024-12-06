import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";
const router = Router();

router.get("/api/roles", authenticateToken, async (req, res) => {
    try {
        const [roles] = await db.connection.query("SELECT * FROM roles"); 
        res.send(roles);
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).send({message: "Something went wrong"});
    }
});

export default router;