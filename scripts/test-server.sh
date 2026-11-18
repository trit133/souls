#!/usr/bin/env bash
# A throwaway account server for the tests that sign in (they use http://127.0.0.1:4111): a fresh database in /tmp,
# never the real one in server/data. Runs in the foreground; Ctrl-C (or kill) stops it and the database goes.
#   scripts/test-server.sh            (then run the test against the 5180 dev server)
set -e
DB=$(mktemp -d)/souls-test.db
trap 'rm -rf "$(dirname "$DB")"' EXIT
cd "$(dirname "$0")/../server"
PORT=4111 DB_PATH="$DB" node index.js
