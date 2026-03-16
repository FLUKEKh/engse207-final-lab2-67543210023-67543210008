require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const morgan      = require('morgan');
const fs          = require('fs');
const path        = require('path');
const taskRoutes  = require('./routes/tasks');

const app  = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(morgan(':method :url :status :response-time ms', {
  stream: { write: (msg) => console.log(msg.trim()) }
}));

app.use('/api/tasks', taskRoutes);
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

async function initDB(pool) {
  const sqlPath = path.join(__dirname, '..', 'init.sql');
  if (fs.existsSync(sqlPath)) {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    try {
      await pool.query(sql);
      console.log('[task-service] DB schema initialized');
    } catch (err) {
      console.error('[task-service] initDB error:', err.message);
    }
  }
}

async function start() {
  const { pool } = require('./db/db');
  let retries = 15;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      console.log('[task-service] DB connected');
      break;
    } catch (err) {
      console.log(`[task-service] Waiting for DB... (${retries} left): ${err.message}`);
      retries--;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  await initDB(pool);
  app.listen(PORT, () => console.log(`[task-service] Running on port ${PORT}`));
}

start();
