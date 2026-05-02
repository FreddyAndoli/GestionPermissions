import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../db/schema';

const dbUrl = process.env.DATABASE_URL;
let connection: mysql.Pool;

if (dbUrl) {
  const parsed = new URL(dbUrl);
  connection = mysql.createPool({
    host: parsed.hostname,
    port: parseInt(parsed.port || '3306'),
    user: parsed.username,
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true
  });
} else {
  connection = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'pm_user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'permission_manager',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true
  });
}

export const db = drizzle(connection, { schema, mode: 'default' });
export { connection };
