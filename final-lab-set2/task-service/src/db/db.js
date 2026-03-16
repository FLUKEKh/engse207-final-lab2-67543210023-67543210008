const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      host:     process.env.DB_HOST     || 'task-db',
      port:     parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME     || 'taskdb',
      user:     process.env.DB_USER     || 'admin',
      password: process.env.DB_PASSWORD || 'secret'
    });

module.exports = { pool };
