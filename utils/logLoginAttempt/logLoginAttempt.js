import fs from "fs";

export const logLoginAttempt = (message, url) => {
    const logMessage = `[${new Date()}] [${url}] ${message}\n`;
    fs.appendFile("log/loginAttempt.log", logMessage, (err) => {
        if (err) console.error("Failed to write to log file:", err);
    });
};