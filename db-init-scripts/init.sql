-- CREATE DATABASE ahadb;

-- Switch to the database
\c ahadb;

DO $$ BEGIN
    -- Create Users Table
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255), -- Nullable because Google OAuth users might not have a password
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        auth_methods TEXT[] NOT NULL CHECK (auth_methods <@ ARRAY['email', 'google_oauth']::text[]),
        login_count INTEGER DEFAULT 0,
        last_session TIMESTAMP,
        is_verified BOOLEAN DEFAULT FALSE
    );
EXCEPTION WHEN DUPLICATE_TABLE THEN
    -- Handle error: table already exists
END $$;

CREATE OR REPLACE FUNCTION notify_user_change()
RETURNS TRIGGER AS $$
DECLARE
    payload json;
BEGIN
    payload := json_build_object(
        'table', TG_TABLE_NAME,
        'action', TG_OP,
        'data', NEW
    );
    PERFORM pg_notify('user_change', payload::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION notify_user_change();
