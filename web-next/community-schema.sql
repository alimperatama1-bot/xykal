CREATE TABLE IF NOT EXISTS community_members (
 subject TEXT PRIMARY KEY,
 github_id TEXT UNIQUE NOT NULL,
 login TEXT NOT NULL,
 joined_at INTEGER NOT NULL,
 last_seen INTEGER NOT NULL DEFAULT 0,
 show_profile INTEGER NOT NULL DEFAULT 0 CHECK(show_profile IN (0,1))
);
CREATE INDEX IF NOT EXISTS community_members_seen ON community_members(last_seen);
CREATE INDEX IF NOT EXISTS community_members_public ON community_members(show_profile,joined_at);
INSERT OR IGNORE INTO community_members(subject,github_id,login,joined_at,last_seen,show_profile)
 SELECT subject,account_id,login,updated,0,0 FROM app_installations WHERE subject LIKE 'github:%';
INSERT OR IGNORE INTO community_members(subject,github_id,login,joined_at,last_seen,show_profile)
 SELECT subject,substr(subject,8),substr(repo,1,instr(repo,'/')-1),updated,0,0 FROM repositories WHERE subject LIKE 'github:%';
