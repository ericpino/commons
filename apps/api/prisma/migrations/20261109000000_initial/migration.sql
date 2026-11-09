-- Existing Commons schema, including PostgreSQL checks and skill trigger.

CREATE TABLE IF NOT EXISTS teams(id text PRIMARY KEY,name text NOT NULL,mission text NOT NULL);
CREATE TABLE IF NOT EXISTS users(id text PRIMARY KEY,name text NOT NULL,title text NOT NULL,role text NOT NULL CHECK(role IN ('employee','lead','finance')),team_id text REFERENCES teams,skills text[] NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS sessions(token text PRIMARY KEY,user_id text REFERENCES users,expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS records(id text PRIMARY KEY,kind text NOT NULL CHECK(kind IN ('post','recognition','goal','allocation','budget')),title text NOT NULL,body text NOT NULL DEFAULT '',team_id text REFERENCES teams,visibility text NOT NULL CHECK(visibility IN ('company','team','finance')),owner_id text REFERENCES users,data jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS joins(user_id text REFERENCES users,record_id text REFERENCES records,PRIMARY KEY(user_id,record_id));
CREATE TABLE IF NOT EXISTS follows(user_id text REFERENCES users,team_id text REFERENCES teams,PRIMARY KEY(user_id,team_id));
CREATE TABLE IF NOT EXISTS audit(id bigserial PRIMARY KEY,actor_id text REFERENCES users,action text NOT NULL,record_id text,team_id text,detail jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS records_kind ON records(kind);
ALTER TABLE records ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('employee','lead','finance','root'));
CREATE TABLE IF NOT EXISTS skills(id bigserial PRIMARY KEY,name text NOT NULL UNIQUE CHECK(name=btrim(name) AND length(name) BETWEEN 1 AND 40));
CREATE UNIQUE INDEX IF NOT EXISTS skills_name_normalized ON skills(lower(name));
-- Preserve existing expertise once, choosing one spelling per case-insensitive name.
INSERT INTO skills(name) SELECT DISTINCT ON (lower(btrim(value))) btrim(value) FROM users CROSS JOIN LATERAL unnest(users.skills) AS value WHERE length(btrim(value)) BETWEEN 1 AND 40 ORDER BY lower(btrim(value)),btrim(value) ON CONFLICT DO NOTHING;
UPDATE users SET skills=ARRAY(SELECT DISTINCT s.name FROM unnest(users.skills) AS value JOIN skills s ON lower(s.name)=lower(btrim(value)) ORDER BY s.name);
-- Guard direct database writes as well as API writes. The catalog is append-only.
CREATE OR REPLACE FUNCTION validate_user_skills() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF cardinality(NEW.skills)>12 OR EXISTS(SELECT 1 FROM unnest(NEW.skills) value WHERE value IS NULL OR NOT EXISTS(SELECT 1 FROM skills WHERE name=value)) THEN
    RAISE EXCEPTION 'Skills must be selected from the catalog (maximum 12)' USING ERRCODE='23514';
  END IF;
  NEW.skills := ARRAY(SELECT DISTINCT value FROM unnest(NEW.skills) value ORDER BY value);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS users_skills_catalog ON users;
CREATE TRIGGER users_skills_catalog BEFORE INSERT OR UPDATE OF skills ON users FOR EACH ROW EXECUTE FUNCTION validate_user_skills();
