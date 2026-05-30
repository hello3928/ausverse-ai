#!/bin/bash
# External health checker — runs via cron every minute
# Logs directly to SQLite so downtime is recorded even when the app is offline

DB="/var/www/app/data/aia.db"
URL="http://127.0.0.1:3000/api/v1/ping"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Check if the app responds
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$URL" 2>/dev/null)

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 400 ]; then
  STATUS="operational"
else
  STATUS="down"
fi

# Log to SQLite
sqlite3 "$DB" "INSERT INTO uptime_log (service, status, latency, checked_at) VALUES ('Web Server', '$STATUS', NULL, '$NOW');"
sqlite3 "$DB" "INSERT INTO uptime_log (service, status, latency, checked_at) VALUES ('Ausverse API', '$STATUS', NULL, '$NOW');"

# Prune old entries (keep 90 days)
sqlite3 "$DB" "DELETE FROM uptime_log WHERE checked_at < datetime('now', '-90 days');"
