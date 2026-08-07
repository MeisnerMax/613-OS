-- 613 OS asset/development pilot schema. Contains no production data or credentials.
CREATE TABLE assets (
  id text PRIMARY KEY,
  name text NOT NULL,
  asset_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('Active','Under examination','Sold')),
  street text,
  zip_code text,
  city text,
  year_built integer,
  living_area_sqm numeric(14,2),
  total_area_sqm numeric(14,2),
  units_rooms integer,
  side_costs_year numeric(14,2),
  asset_price numeric(14,2),
  property_price numeric(14,2),
  renovation_cost_until_2025 numeric(14,2),
  market_value_2021 numeric(14,2),
  market_value_2026 numeric(14,2),
  legacy_source_row integer,
  legacy_sheet_helper text,
  source_name text NOT NULL DEFAULT 'Asset_Overview_v4',
  legacy_imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE TABLE development_projects (
  id text PRIMARY KEY,
  asset_id text NOT NULL REFERENCES assets(id),
  name text NOT NULL,
  source_tab text NOT NULL UNIQUE,
  status text NOT NULL,
  start_date date,
  planned_end_date date,
  as_of_date date,
  current_focus text,
  current_owner text,
  current_start_date date,
  current_completion_evidence text,
  legacy_imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE TABLE development_work_packages (
  project_id text NOT NULL REFERENCES development_projects(id) ON DELETE CASCADE,
  source_id text NOT NULL,
  source_order integer NOT NULL,
  phase text NOT NULL,
  title text NOT NULL,
  action text NOT NULL DEFAULT '',
  owner text,
  start_date date,
  end_date date,
  duration_days integer,
  status text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('High','Medium','Low')),
  source_priority text,
  dependency text,
  completion_evidence text,
  next_package text,
  calendar boolean NOT NULL DEFAULT false,
  plan_offset_days integer,
  legacy_imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  PRIMARY KEY (project_id, source_id),
  UNIQUE (project_id, source_order)
);

CREATE INDEX assets_status_idx ON assets(status);
CREATE INDEX assets_city_idx ON assets(city);
CREATE INDEX assets_type_idx ON assets(asset_type);
CREATE INDEX development_projects_asset_idx ON development_projects(asset_id);
CREATE INDEX development_work_packages_status_idx ON development_work_packages(project_id, status);
CREATE INDEX development_work_packages_owner_idx ON development_work_packages(owner);
CREATE INDEX development_work_packages_start_idx ON development_work_packages(project_id, start_date);
