import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";
import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
import { generalRateLimiter } from "../middleware/rateLimit.js";
const router = Router();

router.get("/api/roles", authenticateToken, generalRateLimiter, async (req, res) => {
    try {
        const current_role_name = req.user.role_name
        if (current_role_name != "owner"){
          res.status(403).send({message: 'Forbidden'})
        } 
        const [roles] = await db.connection.query("SELECT * FROM roles"); 
        res.send(roles);
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong"});
    }
});

export default router;