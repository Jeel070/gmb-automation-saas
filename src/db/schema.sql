-- Run this once to set up the database
-- Supports: Neon, Supabase, or any PostgreSQL provider

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TENANTS
-- Stores both agencies (super-tenant) and clients (sub-tenant)
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  type        VARCHAR(50)  NOT NULL CHECK (type IN ('agency', 'client')),
  agency_id   UUID        REFERENCES tenants(id) ON DELETE SET NULL,  -- null for agency
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- POSTS
-- Every post belongs to one tenant (row-level isolation via tenant_id)
CREATE TABLE IF NOT EXISTS posts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title        VARCHAR(500) NOT NULL,
  content      TEXT        NOT NULL,
  image_url    VARCHAR(1000),
  scheduled_at TIMESTAMP   NOT NULL,
  status       VARCHAR(50)  DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','failed')),
  published_at TIMESTAMP,
  retry_count  INTEGER      DEFAULT 0,
  created_at   TIMESTAMP   DEFAULT NOW(),
  updated_at   TIMESTAMP   DEFAULT NOW()
);

-- PUBLISH LOGS
-- Every publish attempt (success or failure) is logged here
CREATE TABLE IF NOT EXISTS publish_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status       VARCHAR(50)  NOT NULL CHECK (status IN ('success', 'failed')),
  message      TEXT,
  attempted_at TIMESTAMP   DEFAULT NOW()
);

-- Indexes for fast tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_posts_tenant_id     ON posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_status        ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at  ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_logs_post_id        ON publish_logs(post_id);
