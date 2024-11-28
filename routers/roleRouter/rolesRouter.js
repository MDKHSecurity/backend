import { Router } from "express";
import pbkdf2 from "pbkdf2";
import db from "../../database/database.js";
import jwt from "jsonwebtoken";
import { findUser } from "../../utils/checks/findUsers.js"
import { hashElement, verifyPassword } from "../../utils/passwords/hashPassword.js"
import { authenticateToken } from "../middleware/verifyJWT.js";
const router = Router();

const jwtSecret = process.env.JWT_SECRET;


router.get("/api/roles", async (req, res) => {
    try {
        const [roles] = await db.connection.query("SELECT * FROM roles"); 
        res.status(200).json(roles);
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ success: false, message: "Error fetching roles" });
    }
});



export default router;