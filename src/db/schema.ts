import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Projects ──────────────────────────────────────────────────

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Import Logs ───────────────────────────────────────────────

export const importLogs = sqliteTable('import_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_id: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  file_name: text('file_name').notNull(),
  file_type: text('file_type', { enum: ['xlsx', 'pdf', 'csv'] }).notNull(),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).notNull().default('pending'),
  row_count: integer('row_count'),
  error_log: text('error_log'), // JSON string
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Buildings ─────────────────────────────────────────────────

export const buildings = sqliteTable('buildings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_id: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  code: text('code').notNull(), // SE, N, SW
  name: text('name').notNull(),
  num_floors: integer('num_floors').notNull().default(4),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Zones ─────────────────────────────────────────────────────

export const zones = sqliteTable('zones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_id: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  building_id: integer('building_id').references(() => buildings.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  floor_number: integer('floor_number'), // null for exteriors/site zones
  zone_type: text('zone_type', {
    enum: ['interior', 'exterior', 'common', 'foundation', 'site', 'parkade', 'roof', 'elevator', 'stairs'],
  }).notNull().default('interior'),
  display_order: integer('display_order').notNull().default(0),
  color: text('color'),
});

// ─── Companies ─────────────────────────────────────────────────

export const companies = sqliteTable('companies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_id: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Takt Plans ────────────────────────────────────────────────

export const taktPlans = sqliteTable('takt_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_id: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  takt_time: integer('takt_time'), // default takt period in days
  start_date: text('start_date'),
  status: text('status', { enum: ['draft', 'active', 'completed'] }).notNull().default('active'),
  import_log_id: integer('import_log_id').references(() => importLogs.id),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Activities ────────────────────────────────────────────────

export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  takt_plan_id: integer('takt_plan_id').notNull().references(() => taktPlans.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  task_code: text('task_code'),
  company_id: integer('company_id').references(() => companies.id),
  color: text('color'),
  sequence_order: integer('sequence_order').notNull().default(0),
  takt_period: integer('takt_period'), // override per activity
  phase_name: text('phase_name'), // original inTakt phase
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Tasks ─────────────────────────────────────────────────────

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  takt_plan_id: integer('takt_plan_id').notNull().references(() => taktPlans.id, { onDelete: 'cascade' }),
  activity_id: integer('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  zone_id: integer('zone_id').references(() => zones.id),
  intakt_task_id: text('intakt_task_id'), // original Task ID from XLSX
  task_name: text('task_name').notNull(), // original task name from inTakt
  planned_start: text('planned_start').notNull(),
  planned_end: text('planned_end').notNull(),
  actual_start: text('actual_start'),
  actual_end: text('actual_end'),
  baseline_start: text('baseline_start'), // frozen at first import
  baseline_end: text('baseline_end'), // frozen at first import
  status: text('status', {
    enum: ['not_started', 'in_progress', 'completed', 'delayed', 'blocked'],
  }).notNull().default('not_started'),
  intakt_status: text('intakt_status'), // raw status from inTakt
  recovery_status: text('recovery_status', {
    enum: ['on_track', 'delayed', 'recovered'],
  }),
  inherited_delay_days: integer('inherited_delay_days').notNull().default(0),
  recovery_points: integer('recovery_points').notNull().default(0),
  crew_size: integer('crew_size'),
  notes: text('notes'),
  area_raw: text('area_raw'), // original "Area" value from XLSX
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Task Relationships ────────────────────────────────────────

export const taskRelationships = sqliteTable('task_relationships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  predecessor_task_id: integer('predecessor_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  successor_task_id: integer('successor_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  relation_type: text('relation_type', { enum: ['FS', 'SS', 'FF', 'SF'] }).notNull().default('FS'),
  lag_hours: real('lag_hours').notNull().default(0),
});

// ─── Task Delays ───────────────────────────────────────────────

export const taskDelays = sqliteTable('task_delays', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  task_id: integer('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  delay_days: integer('delay_days').notNull(),
  delay_type: text('delay_type', { enum: ['assigned', 'inherited'] }).notNull(),
  reason: text('reason', {
    enum: ['labor', 'material', 'prep', 'design', 'weather', 'inspection', 'prerequisite', 'other'],
  }).notNull(),
  source_task_id: integer('source_task_id').references(() => tasks.id),
  notes: text('notes'),
  created_by: text('created_by'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Site Walks ────────────────────────────────────────────────

export const siteWalks = sqliteTable('site_walks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  takt_plan_id: integer('takt_plan_id').notNull().references(() => taktPlans.id, { onDelete: 'cascade' }),
  walk_date: text('walk_date').notNull(),
  conducted_by: text('conducted_by'),
  notes: text('notes'),
  status: text('status', { enum: ['in_progress', 'completed'] }).notNull().default('in_progress'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Site Walk Entries ─────────────────────────────────────────

export const siteWalkEntries = sqliteTable('site_walk_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  site_walk_id: integer('site_walk_id').notNull().references(() => siteWalks.id, { onDelete: 'cascade' }),
  task_id: integer('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['on_track', 'delayed', 'recovered'] }).notNull(),
  variance_code: text('variance_code', {
    enum: ['labor', 'material', 'prep', 'design', 'weather', 'inspection', 'prerequisite', 'other'],
  }),
  notes: text('notes'),
  voice_note_url: text('voice_note_url'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Site Walk Photos ──────────────────────────────────────────

export const siteWalkPhotos = sqliteTable('site_walk_photos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  site_walk_entry_id: integer('site_walk_entry_id').notNull().references(() => siteWalkEntries.id, { onDelete: 'cascade' }),
  original_url: text('original_url').notNull(),
  thumbnail_url: text('thumbnail_url'),
  markup_url: text('markup_url'),
  content_type: text('content_type'),
  file_size: integer('file_size'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Constraint Checklists ─────────────────────────────────────

export const constraintChecklists = sqliteTable('constraint_checklists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  activity_id: integer('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  display_order: integer('display_order').notNull().default(0),
});

// ─── Constraint Results ────────────────────────────────────────

export const constraintResults = sqliteTable('constraint_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  checklist_item_id: integer('checklist_item_id').notNull().references(() => constraintChecklists.id, { onDelete: 'cascade' }),
  task_id: integer('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  completed_at: text('completed_at'),
});

// ─── Predictive Flags ──────────────────────────────────────────

export const predictiveFlags = sqliteTable('predictive_flags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  takt_plan_id: integer('takt_plan_id').notNull().references(() => taktPlans.id, { onDelete: 'cascade' }),
  source_task_id: integer('source_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  flagged_task_id: integer('flagged_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  risk_level: text('risk_level', { enum: ['medium', 'high'] }).notNull().default('high'),
  reason: text('reason'),
  is_dismissed: integer('is_dismissed', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Floor Plans ───────────────────────────────────────────────

export const floorPlans = sqliteTable('floor_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  building_id: integer('building_id').notNull().references(() => buildings.id, { onDelete: 'cascade' }),
  floor_number: integer('floor_number').notNull(),
  image_url: text('image_url').notNull(),
  image_width: integer('image_width'),
  image_height: integer('image_height'),
});

// ─── Floor Plan Zones (polygon mapping) ────────────────────────

export const floorPlanZones = sqliteTable('floor_plan_zones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  floor_plan_id: integer('floor_plan_id').notNull().references(() => floorPlans.id, { onDelete: 'cascade' }),
  zone_id: integer('zone_id').notNull().references(() => zones.id, { onDelete: 'cascade' }),
  polygon_points: text('polygon_points').notNull(), // JSON: [{x, y}, ...]
});
