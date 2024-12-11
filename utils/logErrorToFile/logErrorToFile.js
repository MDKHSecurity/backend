import fs from "fs";

export const logErrorToFile = (message, url) => {
    const logMessage = `[${new Date()}] [${url}] ${message}\n`;
    fs.appendFile("log/backendErrors.log", logMessage, (err) => {
        if (err) console.error("Failed to write to log file:", err);
    });
};