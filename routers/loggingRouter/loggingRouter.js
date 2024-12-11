import { Router } from "express";
import { authenticateToken } from "../middleware/verifyJWT.js";
import { logErrorsFrontendToFile } from "../../utils/logErrorsFrontend/logErrorsFrontend.js";
import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";

const router = Router();


router.post("/api/logs", authenticateToken, async (req, res) => {
    try {
        const body = req.body;
        logErrorsFrontendToFile(body.errorMessage, body.url);
        res.send({message: "success"});
        
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong" });
    }
});

export default router;