const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.cwd(), 'data', 'takt-flow.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS import_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  row_count INTEGER,
  error_log TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS buildings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  num_floors INTEGER NOT NULL DEFAULT 4,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor_number INTEGER,
  zone_type TEXT NOT NULL DEFAULT 'interior',
  schedule_type TEXT NOT NULL DEFAULT 'interior',
  unique_key TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  color TEXT
);
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS takt_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  takt_time INTEGER,
  start_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  import_log_id INTEGER REFERENCES import_logs(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  takt_plan_id INTEGER NOT NULL REFERENCES takt_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  task_code TEXT,
  company_id INTEGER REFERENCES companies(id),
  color TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  takt_period INTEGER,
  phase_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  takt_plan_id INTEGER NOT NULL REFERENCES takt_plans(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  zone_id INTEGER REFERENCES zones(id),
  intakt_task_id TEXT,
  task_name TEXT NOT NULL,
  planned_start TEXT NOT NULL,
  planned_end TEXT NOT NULL,
  actual_start TEXT,
  actual_end TEXT,
  baseline_start TEXT,
  baseline_end TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  intakt_status TEXT,
  recovery_status TEXT,
  inherited_delay_days INTEGER NOT NULL DEFAULT 0,
  recovery_points INTEGER NOT NULL DEFAULT 0,
  crew_size INTEGER,
  notes TEXT,
  area_raw TEXT,
  is_trackable INTEGER NOT NULL DEFAULT 1,
  imported_as_completed INTEGER NOT NULL DEFAULT 0,
  prev_planned_start TEXT,
  prev_planned_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS import_changelog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_log_id INTEGER NOT NULL REFERENCES import_logs(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  task_id INTEGER REFERENCES tasks(id),
  intakt_task_id TEXT,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS task_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  predecessor_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  successor_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'FS',
  lag_hours REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS task_delays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  delay_days INTEGER NOT NULL,
  delay_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  source_task_id INTEGER REFERENCES tasks(id),
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS site_walks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  takt_plan_id INTEGER NOT NULL REFERENCES takt_plans(id) ON DELETE CASCADE,
  walk_date TEXT NOT NULL,
  conducted_by TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS site_walk_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_walk_id INTEGER NOT NULL REFERENCES site_walks(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  variance_code TEXT,
  notes TEXT,
  voice_note_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS site_walk_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_walk_entry_id INTEGER NOT NULL REFERENCES site_walk_entries(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  thumbnail_url TEXT,
  markup_url TEXT,
  content_type TEXT,
  file_size INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS constraint_checklists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS constraint_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_item_id INTEGER NOT NULL REFERENCES constraint_checklists(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS predictive_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  takt_plan_id INTEGER NOT NULL REFERENCES takt_plans(id) ON DELETE CASCADE,
  source_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  flagged_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL DEFAULT 'high',
  reason TEXT,
  is_dismissed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS delay_weights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  impacts_score INTEGER NOT NULL DEFAULT 1,
  cascading_multiplier REAL NOT NULL DEFAULT 1.5,
  description TEXT
);
CREATE TABLE IF NOT EXISTS floor_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  image_width INTEGER,
  image_height INTEGER
);
CREATE TABLE IF NOT EXISTS floor_plan_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  floor_plan_id INTEGER NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  polygon_points TEXT NOT NULL
);
`);

// ─── Migrations: safely add columns if missing ─────────────────

function hasColumn(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
}

function addColumnIfMissing(table, column, definition) {
  if (!hasColumn(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  Added ${table}.${column}`);
  }
}

console.log('Running migrations...');
addColumnIfMissing('zones', 'schedule_type', "TEXT NOT NULL DEFAULT 'interior'");
addColumnIfMissing('zones', 'unique_key', 'TEXT');
addColumnIfMissing('tasks', 'is_trackable', 'INTEGER NOT NULL DEFAULT 1');
addColumnIfMissing('tasks', 'imported_as_completed', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('tasks', 'prev_planned_start', 'TEXT');
addColumnIfMissing('tasks', 'prev_planned_end', 'TEXT');

// --- Phase 5: Photo Capture & Richer Observations ---
addColumnIfMissing('site_walk_entries', 'severity', 'TEXT');
addColumnIfMissing('site_walk_entries', 'percent_complete', 'INTEGER');

console.log('Database initialized at:', DB_PATH);
db.close();
