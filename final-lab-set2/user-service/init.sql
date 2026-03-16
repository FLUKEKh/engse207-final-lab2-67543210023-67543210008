-- user-db schema
CREATE TABLE IF NOT EXISTS user_profiles (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER      UNIQUE NOT NULL,
  username     VARCHAR(50),
  email        VARCHAR(100),
  role         VARCHAR(20)  DEFAULT 'member',
  display_name VARCHAR(100),
  bio          TEXT,
  avatar_url   VARCHAR(255),
  updated_at   TIMESTAMP    DEFAULT NOW()
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

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
