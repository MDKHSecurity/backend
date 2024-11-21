import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";

const router = Router();

router.get('/api/user', authenticateToken, async (req, res) => {
    const user = req.user;
    const query = `
    SELECT 
        u.id, 
        u.username,
        u.institution_id,
        i.institution_name, 
        r.role_name,
        GROUP_CONCAT(JSON_OBJECT('id', ro.id, 'name', ro.room_name)) AS rooms
    FROM 
        users u
    JOIN 
        users_rooms ur ON u.id = ur.user_id
    JOIN 
        rooms ro ON ur.room_id = ro.id
    JOIN 
        institutions i ON u.institution_id = i.id
    JOIN 
        roles r ON u.role_id = r.id
    WHERE 
        u.username = ?
    GROUP BY 
        u.id;
    `;
    try {
        const [result] = await db.connection.query(query, [user.username]);
        
        if (!result[0]) {
            return res.status(404).send({ error: 'User not found' });
        }
        const userInfo = {
            ...result[0],
            rooms: JSON.parse(`[${result[0].rooms}]`)
        };
        res.status(200).send(userInfo);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Database query failed' });
    }
});

router.get("/api/users/:institutionid", authenticateToken, async (req, res) => {
    const institutionId = req.params.institutionid;
    
    const [users] = await db.connection.query(
        "SELECT * FROM users WHERE institution_id = ?",
        [institutionId]);
        console.log(users)
        res.status(200).send(users)
  });

export default router;