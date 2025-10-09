-- VanSupport Users Table Setup
-- Run this in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Example: Create an admin user
-- IMPORTANT: Replace the password_hash with your own bcrypt hash
-- Generate hash using: bcrypt.hashSync('your-password', 10)

-- INSERT INTO users (email, password_hash, role)
-- VALUES (
--   'admin@example.com',
--   '$2b$10$YourBcryptHashHere',
--   'admin'
-- );

-- Example: Create a regular user
-- INSERT INTO users (email, password_hash, role)
-- VALUES (
--   'user@example.com',
--   '$2b$10$YourBcryptHashHere',
--   'user'
-- );
