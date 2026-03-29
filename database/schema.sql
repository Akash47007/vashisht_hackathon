-- FutureYou Retirement Coach schema
-- PostgreSQL target schema for migrating from in-memory backend store

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  current_age INTEGER NOT NULL,
  retirement_age INTEGER NOT NULL,
  current_monthly_income NUMERIC(14, 2) NOT NULL,
  current_monthly_expense NUMERIC(14, 2) NOT NULL,
  current_savings NUMERIC(14, 2) NOT NULL,
  risk_comfort VARCHAR(24) NOT NULL,
  lifestyle_goals JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS financial_assumptions (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  inflation_rate NUMERIC(8, 6) NOT NULL,
  expected_annual_return_pre_retirement NUMERIC(8, 6) NOT NULL,
  expected_annual_return_post_retirement NUMERIC(8, 6) NOT NULL,
  years_in_retirement INTEGER NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  corpus_required NUMERIC(20, 2) NOT NULL,
  corpus_projected NUMERIC(20, 2) NOT NULL,
  monthly_contribution_needed NUMERIC(14, 2) NOT NULL,
  current_monthly_contribution NUMERIC(14, 2) NOT NULL,
  monthly_gap NUMERIC(14, 2) NOT NULL,
  confidence_score VARCHAR(16) NOT NULL,
  recommended_allocation JSONB NOT NULL,
  assumptions JSONB NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_contributions (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  frequency VARCHAR(16) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  method VARCHAR(16) NOT NULL,
  start_date DATE NOT NULL,
  next_scheduled_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(14, 2) NOT NULL,
  contribution_date DATE NOT NULL,
  contribution_type VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_quests (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  topic VARCHAR(64) NOT NULL,
  duration_seconds INTEGER NOT NULL,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_progress (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  quest_id VARCHAR(64) NOT NULL REFERENCES learning_quests(id),
  completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, quest_id)
);

CREATE TABLE IF NOT EXISTS nudges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  nudge_type VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  clicked_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_event_created
  ON analytics_events (user_id, event_type, created_at);
