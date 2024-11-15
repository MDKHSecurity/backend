import mysql from "mysql2/promise";

//const PORT = process.env.SQL_PORT;
const CONNECTION_STRING = process.env.SQL_CONNECTION_STRING;
const CONNECTION_STRING_CLOUD = process.env.SQL_CONNECTION_STRING_CLOUD;

const connection = await mysql.createConnection(CONNECTION_STRING);

export default {
    connection
};