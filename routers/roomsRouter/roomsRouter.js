import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";

const router = Router();

router.get("/api/rooms/:institutionid", authenticateToken, async (req, res) => {
    const institutionId = req.params.institutionid;
    
    const [rooms] = await db.connection.query(
        "SELECT * FROM rooms WHERE institution_id = ?",
        [institutionId]);
        console.log(rooms)
        res.status(200).send(rooms)
});

router.post("/api/room", authenticateToken, async (req, res) => {
  const body = req.body;

  if (!body.roomName && !body.institutionId) {
    return res
      .status(400)
      .send({ message: "Room name and institution ID are required." });
  }

  try {
    const [existingRoom] = await db.connection.query(
      "SELECT * FROM rooms WHERE room_name = ? AND institution_id = ?",
      [body.roomName, body.institutionId]
    );

    if (existingRoom.length > 0) {
      return res
        .status(409)
        .send({ message: "Room already exists for this institution." });
    }

    const [result] = await db.connection.query(
      "INSERT INTO rooms (room_name, institution_id) VALUES (?, ?)",
      [body.roomName, body.institutionId]
    );

    return res.status(201).send({
      message: "Room created",
      roomId: result.insertId,
    });
  } catch (error) {
    return res.status(500).send({ message: "error" });
  }
});

export default router;
