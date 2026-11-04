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
for J in LanLinkPlugin AppToolsPlugin VoicePlugin LapBrowserPlugin UpdatedReceiver StatusWidget StatusWidgetSmall StatusWidgetMedium StatusWidgetLarge; do sed "s/__PACKAGE__/${APPID}/" "scripts/android/$J.java" > "$JDIR/$J.java"; done
# permissions for the Wi-Fi link (network name needs location), notifications and installing updates
# updates install without asking (Android 12+) only with UPDATE_PACKAGES_WITHOUT_USER_ACTION; after the
# update the app opens again by itself (UpdatedReceiver)
grep -q 'UpdatedReceiver' "$MAN" || sed -i 's|</application>|    <receiver android:name=".UpdatedReceiver" android:exported="false"><intent-filter><action android:name="android.intent.action.MY_PACKAGE_REPLACED" /></intent-filter></receiver>\n    </application>|' "$MAN"
# the home screen widget (StatusWidget): its layout, look and description
RES=android/app/src/main/res
mkdir -p "$RES/layout" "$RES/xml" "$RES/drawable"
cp scripts/android/res/layout/amp_widget.xml "$RES/layout/"; cp scripts/android/res/xml/amp_widget*_info.xml "$RES/xml/"; cp scripts/android/res/drawable/amp_widget_*.xml "$RES/drawable/"
# a game: Android's game mode (Android 12+) and the phone's own game booster recognise it and remember its mode
cp scripts/android/res/xml/game_mode_config.xml "$RES/xml/"
# the app icon: the same compass rose as the PC app (adaptive icon, with round and classic ones for older Android)
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do mkdir -p "$RES/mipmap-$d"; cp scripts/android/res/mipmap-$d/ic_launcher*.png "$RES/mipmap-$d/"; done
mkdir -p "$RES/mipmap-anydpi-v26"; cp scripts/android/res/mipmap-anydpi-v26/ic_launcher*.xml "$RES/mipmap-anydpi-v26/"
cp scripts/android/res/values/ic_launcher_background.xml "$RES/values/"
# more memory for the app (big airports, the cabin and satellite imagery)
grep -q 'largeHeap' "$MAN" || sed -i 's/<application/<application android:largeHeap="true"/' "$MAN"
grep -q 'appCategory' "$MAN" || sed -i 's/<application/<application android:appCategory="game" android:isGame="true"/' "$MAN"
grep -q 'android.game_mode_config' "$MAN" || sed -i 's|</application>|    <meta-data android:name="android.game_mode_config" android:resource="@xml/game_mode_config" />\n    </application>|' "$MAN"
grep -q 'amp_widget_desc' "$RES/values/strings.xml" || sed -i 's|</resources>|    <string name="amp_widget_desc">Your airline and your tablet: the bigger you make it, the more it shows</string>\n</resources>|' "$RES/values/strings.xml"
grep -q 'amp_widget_small_desc' "$RES/values/strings.xml" || sed -i 's|</resources>|    <string name="amp_widget_small_desc">Balance, profit today and the next flight</string>\n    <string name="amp_widget_medium_desc">Your airline with charts: profit, jet fuel and the fleet</string>\n    <string name="amp_widget_large_desc">Your airline and your tablet: charts, memory, processor, graphics, storage, and freeing memory and space</string>\n</resources>|' "$RES/values/strings.xml"
grep -q '"\.StatusWidget"' "$MAN" || sed -i 's|</application>|    <receiver android:name=".StatusWidget" android:label="Airline Manager Pro" android:exported="false"><intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter><meta-data android:name="android.appwidget.provider" android:resource="@xml/amp_widget_info" /></receiver>\n    </application>|' "$MAN"
for K in Small Medium Large; do k=$(echo "$K" | tr 'A-Z' 'a-z')
  grep -q "\.StatusWidget$K\"" "$MAN" || sed -i "s|</application>|    <receiver android:name=\".StatusWidget$K\" android:label=\"Airline Manager Pro ($k)\" android:exported=\"false\"><intent-filter><action android:name=\"android.appwidget.action.APPWIDGET_UPDATE\" /></intent-filter><meta-data android:name=\"android.appwidget.provider\" android:resource=\"@xml/amp_widget_${k}_info\" /></receiver>\n    </application>|" "$MAN"
done
for P in ACCESS_WIFI_STATE ACCESS_NETWORK_STATE CHANGE_WIFI_MULTICAST_STATE ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION POST_NOTIFICATIONS REQUEST_INSTALL_PACKAGES UPDATE_PACKAGES_WITHOUT_USER_ACTION KILL_BACKGROUND_PROCESSES BLUETOOTH_SCAN BLUETOOTH_CONNECT; do
  grep -q "android.permission.$P\"" "$MAN" || sed -i "s|</manifest>|    <uses-permission android:name=\"android.permission.$P\" />\n</manifest>|" "$MAN"
done
# pairing controllers and headsets inside the app (Settings → Devices): the older Bluetooth permissions up to Android 11
for P in BLUETOOTH BLUETOOTH_ADMIN; do
  grep -q "android.permission.$P\"" "$MAN" || sed -i "s|</manifest>|    <uses-permission android:name=\"android.permission.$P\" android:maxSdkVersion=\"30\" />\n</manifest>|" "$MAN"
done
# Game Booster (Android 13 and older): the apps on the home screen it may close in the background
grep -q '<queries>' "$MAN" || sed -i 's|<application|<queries><intent><action android:name="android.intent.action.MAIN" /><category android:name="android.intent.category.LAUNCHER" /></intent></queries>\n    <application|' "$MAN"
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
