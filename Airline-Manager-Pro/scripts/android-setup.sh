#!/usr/bin/env bash
# Prepares the Android project from app.config.json: landscape only, name, id and version.
set -euo pipefail
cd "$(dirname "$0")/.."
LOG=$(mktemp)
# Report the failing command as a build annotation so it shows on the run summary.
trap 'echo "::error title=Android setup failed::line $LINENO: $BASH_COMMAND"; tail -n 15 "$LOG" | while IFS= read -r l; do echo "::error::$l"; done' ERR
run() { "$@" >>"$LOG" 2>&1; }
NAME=$(node -p "require('./app.config.json').appName")
VERSION=$(node -p "require('./app.config.json').version")
CODE=$(node -p "require('./app.config.json').versionCode")
[ -d android ] || run npx cap add android
run npx cap sync android
MAN=android/app/src/main/AndroidManifest.xml
# landscape only (both directions), keep the app full screen while flying
grep -q 'screenOrientation' "$MAN" || sed -i 's/<activity/<activity android:screenOrientation="sensorLandscape"/' "$MAN"
# full-screen immersive activity (see scripts/android/MainActivity.java)
APPID=$(node -p "require('./app.config.json').appId")
JDIR="android/app/src/main/java/$(echo "$APPID" | tr '.' '/')"
mkdir -p "$JDIR"
sed "s/__PACKAGE__/${APPID}/" scripts/android/MainActivity.java > "$JDIR/MainActivity.java"
GR=android/app/build.gradle
sed -i "s/versionCode [0-9]*/versionCode ${CODE}/; s/versionName \"[^\"]*\"/versionName \"${VERSION}\"/" "$GR"
sed -i "s|<string name=\"app_name\">.*</string>|<string name=\"app_name\">${NAME}</string>|; s|<string name=\"title_activity_main\">.*</string>|<string name=\"title_activity_main\">${NAME}</string>|" android/app/src/main/res/values/strings.xml
echo "Android project ready: ${NAME} ${VERSION} (${CODE})"
