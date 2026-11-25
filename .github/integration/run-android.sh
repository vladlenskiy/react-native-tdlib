#!/usr/bin/env bash
# Installs the release APK of the generated app on a running emulator,
# launches it and waits for the TDLIB_CHECK_RESULT line in logcat.
set -euo pipefail

APK="$1"
PKG="com.tdlibcheck"

adb install -r "$APK"
adb logcat -c
adb shell am start -W -n "$PKG/.MainActivity"

line=""
for _ in $(seq 1 240); do
  line=$(adb logcat -d -s ReactNativeJS:V | grep -m1 'TDLIB_CHECK_RESULT' || true)
  [ -n "$line" ] && break
  sleep 1
done

if [ -z "$line" ]; then
  echo "::error::No TDLIB_CHECK_RESULT line in logcat after 240s"
  adb logcat -d | grep -E "ReactNativeJS|AndroidRuntime|$PKG" | tail -80 || true
  exit 1
fi

echo "$line"
case "$line" in
  *"TDLIB_CHECK_RESULT PASS"*) ;;
  *) echo "::error::$line"; exit 1 ;;
esac
