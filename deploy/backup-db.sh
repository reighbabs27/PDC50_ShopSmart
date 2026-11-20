#!/usr/bin/env bash
# Logical backup of the ShopSmart database on the EC2 host. Keeps the newest 7 dumps.
#   sudo shopsmart-backup
# A backup on the same instance does not survive deleting the instance or its volume:
# copy the newest dump off the host (scp) before cleanup if you need to keep the data.
set -euo pipefail
DIR=/var/backups/shopsmart
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
sudo -u postgres pg_dump -Fc shopsmart -f "$DIR/shopsmart-$STAMP.dump"
ls -1t "$DIR"/shopsmart-*.dump | tail -n +8 | xargs -r rm -f
echo "Backup written: $DIR/shopsmart-$STAMP.dump"
