import mysql from "mysql2/promise";

const CONNECTION_STRING = process.env.SQL_CONNECTION_STRING;

let connection;

try {
    connection = await mysql.createConnection(CONNECTION_STRING);
} catch (error) {
    console.log("Error connecting to the database:", error.message);
    // Vil vi have andet til at ske her?
}

export default {
    connection
};
