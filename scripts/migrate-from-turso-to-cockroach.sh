#!/usr/bin/env bash

turso db list
turso db shell prereview-sandbox "DROP TABLE IF EXISTS effect_sql_migrations;"
turso db shell prereview-sandbox .dump >prereview-sandbox-turso-dump.sql
