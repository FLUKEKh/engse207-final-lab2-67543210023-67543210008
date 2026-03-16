-- auth-db schema
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  DEFAULT 'member',
  created_at    TIMESTAMP    DEFAULT NOW(),
  last_login    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
  id          SERIAL PRIMARY KEY,
  level       VARCHAR(10)  NOT NULL,
  event       VARCHAR(100) NOT NULL,
  user_id     INTEGER,
  message     TEXT,
  meta        JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Seed users (bcrypt hash ของ alice123 / bob456 / adminpass)
INSERT INTO users (username, email, password_hash, role) VALUES
  ('alice', 'alice@lab.local', '$2b$10$T3TFU5Sc/zamPLN0wzByc.TT1daqPE/0UzXwEuAZCBnLD.rD4uEOq', 'member'),
  ('bob',   'bob@lab.local',   '$2b$10$61I2LVH8JC4uA6o/CHR2peCePMbABNzEiCV.fsAH6ZTPrJi6Ex3sa', 'member'),
  ('admin', 'admin@lab.local', '$2b$10$Q2VzhLC3U4LFvh.jC8TD5O7fMYq.94TVXGZxVy0go2zRBfN86G1PC', 'admin')
ON CONFLICT (username) DO UPDATE SET
  email         = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  role          = EXCLUDED.role;
