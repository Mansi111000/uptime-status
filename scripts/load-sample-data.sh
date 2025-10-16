#!/usr/bin/env bash
set -euo pipefail
psql "postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$POSTGRES_DB" <<'SQL'
INSERT INTO monitors (name, url, method, interval_sec, timeout_ms, expected_statuses, is_enabled)
VALUES ('Example', 'https://example.com', 'GET', 60, 5000, '{200,201,204}', true)
ON CONFLICT DO NOTHING;
SQL