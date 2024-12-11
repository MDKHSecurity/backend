import fs from "fs";

export const logErrorsFrontendToFile = (message, url) => {
    const logMessage = `[${new Date()}] [${url}] ${message}\n`;
    fs.appendFile("log/frontendErrors.log", logMessage, (err) => {
        if (err) console.error("Failed to write to log file:", err);
    });
};