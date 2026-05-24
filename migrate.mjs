import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("No DATABASE_URL");

  let cleanUrl = connectionString;
  let ssl = undefined;
  if (cleanUrl.includes('?ssl=')) {
    const parts = cleanUrl.split('?ssl=');
    cleanUrl = parts[0];
    ssl = { rejectUnauthorized: true };
  }

  const connection = await mysql.createConnection({ uri: cleanUrl, ssl });

  console.log("Altering users table...");
  const addCol = async (q) => {
    try { await connection.query(q); }
    catch(e) { if (!e.message.includes("Duplicate column name")) throw e; }
  };
  
  await addCol("ALTER TABLE users ADD COLUMN passwordHash VARCHAR(255)");
  await addCol("ALTER TABLE users ADD COLUMN isVerified BOOLEAN DEFAULT FALSE NOT NULL");
  await addCol("ALTER TABLE users ADD COLUMN twoFactorEnabled BOOLEAN DEFAULT FALSE NOT NULL");
  await addCol("ALTER TABLE users ADD COLUMN twoFactorType ENUM('totp', 'email')");
  await addCol("ALTER TABLE users ADD COLUMN twoFactorSecret VARCHAR(255)");
  await addCol("ALTER TABLE users ADD COLUMN otpCode VARCHAR(10)");
  await addCol("ALTER TABLE users ADD COLUMN otpExpiresAt TIMESTAMP");
  await addCol("ALTER TABLE users ADD COLUMN lockedUntil TIMESTAMP");
  
  // Make openId nullable and drop the unique constraint so it doesn't break new users
  try { await connection.query("ALTER TABLE users MODIFY COLUMN openId VARCHAR(64) NULL"); } catch(e) {}
  try { await connection.query("ALTER TABLE users DROP INDEX openId"); } catch(e) {}

  console.log("Creating auth_audit_logs table...");
  await connection.query(`
    CREATE TABLE IF NOT EXISTS auth_audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT,
      eventType VARCHAR(50) NOT NULL,
      ipAddress VARCHAR(64) NOT NULL,
      userAgent TEXT NOT NULL,
      riskScore INT DEFAULT 0,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  console.log("Success!");
  await connection.end();
}

run().catch(console.error);
