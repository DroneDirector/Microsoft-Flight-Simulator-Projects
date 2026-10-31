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
# split screen and pop-up windows: the app resizes instead of restarting
grep -q 'resizeableActivity' "$MAN" || sed -i 's/<activity/<activity android:resizeableActivity="true"/' "$MAN"
# full-screen immersive activity (see scripts/android/MainActivity.java)
APPID=$(node -p "require('./app.config.json').appId")
JDIR="android/app/src/main/java/$(echo "$APPID" | tr '.' '/')"
mkdir -p "$JDIR"
sed "s/__PACKAGE__/${APPID}/" scripts/android/MainActivity.java > "$JDIR/MainActivity.java"
for J in LanLinkPlugin AppToolsPlugin VoicePlugin UpdatedReceiver StatusWidget; do sed "s/__PACKAGE__/${APPID}/" "scripts/android/$J.java" > "$JDIR/$J.java"; done
# permissions for the Wi-Fi link (network name needs location), notifications and installing updates
# updates install without asking (Android 12+) only with UPDATE_PACKAGES_WITHOUT_USER_ACTION; after the
# update the app opens again by itself (UpdatedReceiver)
grep -q 'UpdatedReceiver' "$MAN" || sed -i 's|</application>|    <receiver android:name=".UpdatedReceiver" android:exported="false"><intent-filter><action android:name="android.intent.action.MY_PACKAGE_REPLACED" /></intent-filter></receiver>\n    </application>|' "$MAN"
# the home screen widget (StatusWidget): its layout, look and description
RES=android/app/src/main/res
mkdir -p "$RES/layout" "$RES/xml" "$RES/drawable"
cp scripts/android/res/layout/amp_widget.xml "$RES/layout/"; cp scripts/android/res/xml/amp_widget_info.xml "$RES/xml/"; cp scripts/android/res/drawable/amp_widget_bg.xml "$RES/drawable/"
grep -q 'amp_widget_desc' "$RES/values/strings.xml" || sed -i 's|</resources>|    <string name="amp_widget_desc">Balance, next flight and aircraft in the air</string>\n</resources>|' "$RES/values/strings.xml"
grep -q 'StatusWidget' "$MAN" || sed -i 's|</application>|    <receiver android:name=".StatusWidget" android:exported="false"><intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter><meta-data android:name="android.appwidget.provider" android:resource="@xml/amp_widget_info" /></receiver>\n    </application>|' "$MAN"
for P in ACCESS_WIFI_STATE ACCESS_NETWORK_STATE CHANGE_WIFI_MULTICAST_STATE ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION POST_NOTIFICATIONS REQUEST_INSTALL_PACKAGES UPDATE_PACKAGES_WITHOUT_USER_ACTION; do
  grep -q "android.permission.$P\"" "$MAN" || sed -i "s|</manifest>|    <uses-permission android:name=\"android.permission.$P\" />\n</manifest>|" "$MAN"
done
GR=android/app/build.gradle
# sign every build with the fixed test key (signing/), so new APKs install over the old one
if ! grep -q 'airlinemanagerpro-test' "$GR"; then
  PW=$(cat signing/test-signing.password)
  sed -i "0,/^android {/s||android {\n    signingConfigs {\n        debug {\n            storeFile file('../../signing/test-signing.jks')\n            storePassword '${PW}'\n            keyAlias 'airlinemanagerpro-test'\n            keyPassword '${PW}'\n        }\n    }|" "$GR"
fi
# the voice model runs with ONNX Runtime (MIT License); only the phone processor types are packed
if ! grep -q 'onnxruntime-android' "$GR"; then
  sed -i "0,/^dependencies {/s||dependencies {\n    implementation 'com.microsoft.onnxruntime:onnxruntime-android:1.20.0'|" "$GR"
  sed -i "0,/defaultConfig {/s||defaultConfig {\n        ndk { abiFilters 'arm64-v8a', 'armeabi-v7a', 'x86_64' }|" "$GR"
fi
sed -i "s/versionCode [0-9]*/versionCode ${CODE}/; s/versionName \"[^\"]*\"/versionName \"${VERSION}\"/" "$GR"
sed -i "s|<string name=\"app_name\">.*</string>|<string name=\"app_name\">${NAME}</string>|; s|<string name=\"title_activity_main\">.*</string>|<string name=\"title_activity_main\">${NAME}</string>|" android/app/src/main/res/values/strings.xml
echo "Android project ready: ${NAME} ${VERSION} (${CODE})"
