export const schema = `
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
INSERT INTO teams(id,name,mission) VALUES ('product','Product & Engineering','Make great work easier to discover.'),('operations','Customer Operations','Turn customer signals into lasting improvements.') ON CONFLICT DO NOTHING;
INSERT INTO users(id,name,title,role,team_id,skills) VALUES ('maya','Maya Chen','Product designer','employee','product',ARRAY['Product design','Research']),('alex','Alex Morgan','Engineering lead','lead','product',ARRAY['TypeScript','Architecture']),('jordan','Jordan Lee','Finance partner','finance','operations',ARRAY['Financial planning','Operations']),('sam','Sam Rivera','Customer success specialist','employee','operations',ARRAY['Customer research','Onboarding']) ON CONFLICT DO NOTHING;
INSERT INTO users(id,name,title,role,team_id,skills) VALUES ('root','Root Admin','Workspace administrator','root','product',ARRAY['Workspace administration']) ON CONFLICT DO NOTHING;
INSERT INTO records(id,kind,title,body,team_id,visibility,owner_id,data) VALUES
('post-launch','post','A clearer path from sign-up to first value','Our onboarding research is ready. Five fictional customer interviews helped us simplify the first-run experience. Feedback welcome.','product','company','maya','{}'),
('post-private','post','Sprint planning notes','Internal engineering discussion: prioritize accessibility fixes this week.','product','team','alex','{}'),
('recognition-sam','recognition','Thank you for connecting the dots','Sam brought customer questions into our research and helped us see the full picture.','operations','company','maya','{"recipient":"sam","badge":"Collaboration"}'),
('goal-onboarding','goal','Make onboarding feel effortless','Reduce time to first value through research and simpler setup.','product','company','alex','{"progress":65,"target":"Pilot onboarding release","evidence":"Research synthesis and prototype review completed"}'),
('goal-support','goal','Build a shared customer knowledge base','Help colleagues discover reusable answers.','operations','company','jordan','{"progress":40,"target":"Publish 20 onboarding guides","evidence":"8 guides published"}'),
('allocation-research','allocation','Help shape the next onboarding experience','An invitation to collaborate on research synthesis. Join if this matches your interests.','product','company','alex','{"hours":8,"capacity":24,"needed":16}'),
('allocation-guides','allocation','Share your customer expertise','Help turn customer questions into practical guides.','operations','company','jordan','{"hours":4,"capacity":16,"needed":12}'),
('budget-product','budget','Product pilot budget','Design research, infrastructure and pilot operations.','product','finance','jordan','{"planned":18000,"actual":11200,"driver":"Research: 4200; infrastructure: 3000; pilot operations: 4000","currency":"USD"}'),
('budget-operations','budget','Customer enablement budget','Knowledge base and onboarding materials.','operations','finance','jordan','{"planned":10000,"actual":6400,"driver":"Content: 4000; tooling: 2400","currency":"USD"}') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS skills(id bigserial PRIMARY KEY,name text NOT NULL UNIQUE CHECK(name=btrim(name) AND length(name) BETWEEN 1 AND 40));
CREATE UNIQUE INDEX IF NOT EXISTS skills_name_normalized ON skills(lower(name));
INSERT INTO skills(name) SELECT name FROM unnest(ARRAY['Accessibility','Architecture','AWS','Communication','Customer research','Customer success','Data analysis','Docker','Financial planning','GraphQL','JavaScript','Leadership','NestJS','Next.js','Node.js','Onboarding','Operations','PostgreSQL','Product design','Product management','Project management','Python','React','Research','SQL','Testing','TypeScript','UX design','Verification','Workspace administration']) AS name ON CONFLICT DO NOTHING;
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
`;
