import express from "express";
import dotenv from "dotenv/config";

const app = express();
app.use(express.json());

import videoRouter from "./routers/videoRouter/videoRouter.js";
app.use(videoRouter);

app.use(express.urlencoded({ extended: true }));

const PORT = 8080 || process.env.PORT;
app.listen(PORT, () => {{
    console.log("Server is running on port", PORT);
}});