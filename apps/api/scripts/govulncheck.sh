#!/usr/bin/env bash
# Runs govulncheck and fails on reachable vulnerabilities not listed in govulncheck.allow.
set -euo pipefail
cd "$(dirname "$0")/.."

allowed=$(grep -oE '^GO-[0-9]+-[0-9]+' govulncheck.allow || true)
found=$(go tool -modfile=tools.mod govulncheck -format json ./... |
	jq -r 'select(.finding.trace[0].function) | .finding.osv' | sort -u)

status=0
for id in $found; do
	if grep -qx "$id" <<<"$allowed"; then
		echo "allowed: $id"
	else
		echo "vulnerable: $id (https://pkg.go.dev/vuln/$id)"
		status=1
	fi
done

if [ "$status" -ne 0 ]; then
	go tool -modfile=tools.mod govulncheck ./... || true
fi
exit "$status"
