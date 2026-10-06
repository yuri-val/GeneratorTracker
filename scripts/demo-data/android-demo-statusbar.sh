#!/bin/sh
# Clean Android status bar for screenshots (current time, full battery and signal, no notifications).
# Usage: android-demo-statusbar.sh on|off   (uses the single attached emulator)
ADB="${ADB:-adb}"
if [ "$1" = "off" ]; then
  $ADB shell am broadcast -a com.android.systemui.demo -e command exit >/dev/null
  exit 0
fi
$ADB shell settings put global sysui_demo_allowed 1
for args in "-e command enter" "-e command clock -e hhmm $(date +%H%M)" \
  "-e command battery -e level 100 -e plugged false" \
  "-e command network -e wifi show -e level 4 -e mobile hide" \
  "-e command notifications -e visible false"; do
  $ADB shell am broadcast -a com.android.systemui.demo $args >/dev/null
done
