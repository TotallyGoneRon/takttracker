#!/bin/bash
# Database backup - creates timestamped copy of production database
# Usage: npm run db:backup

DB_PATH="./data/takt-flow.db"
BACKUP_DIR="./data/backups"

if [ ! -f "$DB_PATH" ]; then
  echo "ERROR: Database not found at $DB_PATH"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/takt-flow-${TIMESTAMP}.db"

# Try sqlite3 .backup for WAL-safe snapshot, fall back to cp
if command -v sqlite3 &> /dev/null; then
  sqlite3 "$DB_PATH" ".backup '${BACKUP_PATH}'"
else
  cp "$DB_PATH" "$BACKUP_PATH"
  [ -f "${DB_PATH}-wal" ] && cp "${DB_PATH}-wal" "${BACKUP_PATH}-wal"
  [ -f "${DB_PATH}-shm" ] && cp "${DB_PATH}-shm" "${BACKUP_PATH}-shm"
fi

if [ $? -eq 0 ]; then
  echo "Backup created: $BACKUP_PATH"
  echo "Size: $(du -h "$BACKUP_PATH" | cut -f1)"
  # Keep only last 10 backups
  ls -t "$BACKUP_DIR"/takt-flow-*.db 2>/dev/null | tail -n +11 | xargs -r rm
else
  echo "ERROR: Backup failed"
  exit 1
fi
