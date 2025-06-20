const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
  connectTimeout: 10000,
  keepAliveInitialDelay: 10000,
  enableKeepAlive: true
});

console.log('Database connected');

module.exports = pool;
