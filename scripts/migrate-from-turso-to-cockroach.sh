#!/usr/bin/env bash

turso db list
turso db shell prereview-sandbox "DROP TABLE IF EXISTS effect_sql_migrations;"
turso db shell prereview-sandbox .dump > prereview-sandbox-turso-dump.sql
sed -i '/PRAGMA foreign_keys=OFF;/d' prereview-sandbox-turso-dump.sql
sed -i '/FOREIGN KEY/s/$/,/' prereview-sandbox-turso-dump.sql
cockroach sql --execute "DELETE FROM events"
cockroach sql --execute "DELETE FROM resources"
cockroach sql < prereview-sandbox-turso-dump.sql
cockroach sql --execute "SELECT * FROM resources"
