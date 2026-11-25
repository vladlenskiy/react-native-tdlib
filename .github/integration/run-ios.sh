#!/usr/bin/env bash
# Boots a throwaway iPhone simulator, installs the Release build of the
# generated app, launches it and waits for the TDLIB_CHECK_RESULT line in
# the simulator log.
set -euo pipefail

APP="$1"
BUNDLE_ID=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Info.plist")

# Newest iOS runtime that supports a plain "iPhone N" model, and that model.
read -r RUNTIME DEVICE_TYPE < <(xcrun simctl list runtimes available -j | python3 -c '
import json, re, sys
best = None
for r in json.load(sys.stdin)["runtimes"]:
    if r["platform"] != "iOS":
        continue
    phones = [d for d in r.get("supportedDeviceTypes", []) if re.fullmatch(r"iPhone \d+", d["name"])]
    if not phones:
        continue
    phone = max(phones, key=lambda d: int(d["name"].split()[1]))
    key = [int(p) for p in r["version"].split(".")]
    if best is None or key > best[0]:
        best = (key, r["identifier"], phone["identifier"])
print(best[1], best[2])
')
echo "runtime: $RUNTIME, device type: $DEVICE_TYPE"

UDID=$(xcrun simctl create tdlib-check "$DEVICE_TYPE" "$RUNTIME")
trap 'xcrun simctl shutdown "$UDID" >/dev/null 2>&1 || true; xcrun simctl delete "$UDID" >/dev/null 2>&1 || true' EXIT

xcrun simctl boot "$UDID"
xcrun simctl bootstatus "$UDID" -b >/dev/null
xcrun simctl install "$UDID" "$APP"
xcrun simctl launch "$UDID" "$BUNDLE_ID"

line=""
for _ in $(seq 1 30); do
  sleep 3
  line=$(xcrun simctl spawn "$UDID" log show --last 5m --info --style compact \
    --predicate 'eventMessage CONTAINS "TDLIB_CHECK_RESULT"' 2>/dev/null |
    grep -m1 'TDLIB_CHECK_RESULT' || true)
  [ -n "$line" ] && break
done

if [ -z "$line" ]; then
  echo "::error::No TDLIB_CHECK_RESULT line in the simulator log after 90s"
  xcrun simctl spawn "$UDID" log show --last 5m --info --style compact \
    --predicate "process == \"$(basename "$APP" .app)\"" 2>/dev/null | tail -80 || true
  exit 1
fi

echo "$line"
case "$line" in
  *"TDLIB_CHECK_RESULT PASS"*) ;;
  *) echo "::error::$line"; exit 1 ;;
esac
