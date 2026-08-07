-- 613 OS task database schema. Contains no production data or credentials.
CREATE TABLE tasks (
  id text PRIMARY KEY,
  title text NOT NULL,
  property_project text NOT NULL DEFAULT '',
  category text,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','In progress','Waiting','Done')),
  waiting_for text,
  waiting_since date,
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High','Medium','Low')),
  owner text,
  support text,
  info text,
  deadline date,
  next_step text,
  next_step_by date,
  latest_progress text,
  last_activity date,
  source text,
  source_created date,
  flag_original text,
  source_email text,
  documents text,
  drive_folder text,
  description text NOT NULL DEFAULT '',
  source_bucket text CHECK (source_bucket IN ('DATA','ARCHIVE','WEBAPP')),
  legacy_imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at timestamptz
);

CREATE TABLE task_updates (
  id bigserial PRIMARY KEY,
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  body text NOT NULL,
  update_type text NOT NULL DEFAULT 'comment',
  author_email text,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE activity_events (
  id bigserial PRIMARY KEY,
  entity_type text NOT NULL DEFAULT 'task',
  entity_id text NOT NULL,
  action text NOT NULL,
  actor_email text,
  actor_name text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE migration_runs (
  migration_key text PRIMARY KEY,
  source_name text NOT NULL,
  expected_count integer NOT NULL,
  imported_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'prepared',
  checksum text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX tasks_status_idx ON tasks(status);
CREATE INDEX tasks_owner_idx ON tasks(owner);
CREATE INDEX tasks_deadline_idx ON tasks(deadline);
CREATE INDEX tasks_property_project_idx ON tasks(property_project);
CREATE INDEX tasks_updated_at_idx ON tasks(updated_at DESC);
CREATE INDEX task_updates_task_created_idx ON task_updates(task_id, created_at DESC);
CREATE INDEX activity_events_entity_created_idx ON activity_events(entity_type, entity_id, created_at DESC);
