// src/config/db.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Load biến môi trường từ file .env
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || process.env.DB_PASS || "",
  database: process.env.DB_NAME || "school_bus_system",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // XAMPP MySQL compatibility
  timezone: '+00:00',
  dateStrings: false,
});

export default pool;

export function getConnection() {
  throw new Error("Function not implemented.");
}
