const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 3306,
};
const DB_NAME = process.env.DB_NAME;

async function initDatabase() {
  let connection;
  try {
    // Connect to MySQL server (without specifying a database)
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to MySQL server.");

    // Drop database if it exists
    await connection.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    console.log(`🗑️ Database '${DB_NAME}' dropped (if existed).`);

    // Create database
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
    console.log(`✨ Database '${DB_NAME}' created.`);

    // Use the newly created database
    await connection.query(`USE ${DB_NAME}`);
    console.log(`🚀 Using database '${DB_NAME}'.`);

    // Read and execute schema SQL
    const schemaPath = path.resolve(__dirname, "../../database/SSB.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    // Split by semicolon, but handle semicolons within comments or strings if necessary (basic split for now)
    const statements = schemaSql
      .split(";")
      .filter(
        (s) =>
          s.trim().length > 0 &&
          !s.trim().startsWith("--") &&
          !s.trim().startsWith("/*")
      );

    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (
        trimmedStatement.length > 0 &&
        (trimmedStatement.startsWith("CREATE TABLE") ||
          trimmedStatement.startsWith("INSERT INTO") ||
          trimmedStatement.startsWith("USE") ||
          trimmedStatement.startsWith("CREATE DATABASE"))
      ) {
        try {
          await connection.query(trimmedStatement);
          console.log(`✅ Executed: ${trimmedStatement.substring(0, 50)}...`);
        } catch (error) {
          console.error(
            `❌ Error executing statement: ${trimmedStatement.substring(
              0,
              50
            )}...`
          );
          console.error(error.message);
        }
      }
    }
    console.log("📄 Database schema and initial data loaded from SSB.sql.");

    console.log("🎉 Database initialization and seeding complete!");
  } catch (error) {
    console.error("❌ Error during database initialization:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 MySQL connection closed.");
    }
  }
}

initDatabase();
