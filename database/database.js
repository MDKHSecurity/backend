import mysql from "mysql2/promise";
import { logErrorToFile } from "../utils/logErrorToFile/logErrorToFile.js";

const CONNECTION_STRING = process.env.SQL_CONNECTION_STRING;

let connection;

try {
    connection = await mysql.createConnection(CONNECTION_STRING);
} catch (error) {
    logErrorToFile(error, "database.js")
}

export default {
    connection
};
