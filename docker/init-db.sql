-- ===========================================
-- CargoBit Database Initialization
-- ===========================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS cargobit;

-- Set search path
SET search_path TO public;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE cargobit TO cargobit;
GRANT ALL PRIVILEGES ON SCHEMA public TO cargobit;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cargobit;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cargobit;

-- Log
DO $$
BEGIN
    RAISE NOTICE 'CargoBit database initialized successfully';
END $$;
