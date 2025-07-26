#!/usr/bin/env bash
ITEM="$1"
SID="$2"
FOCUSED=$(yabai -m query --spaces --space | jq -r '.index')

if [ "$SID" -eq "$FOCUSED" ]; then
  sketchybar --set "$ITEM" background.color=0xFF89B4FA label.color=0xFF11111B
else
  sketchybar --set "$ITEM" background.color=0xFF11111B label.color=0xFFCDD6F4
fi
