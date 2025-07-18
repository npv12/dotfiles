#!/usr/bin/env bash

# Detect active window manager
if command -v yabai &>/dev/null; then
  FOCUSED_SPACE=$(yabai -m query --spaces --space | jq -r '.index')
elif command -v aerospace &>/dev/null; then
  FOCUSED_SPACE=$(aerospace list-workspaces --focused)
else
  exit 1
fi

SID="${NAME##*.}"

if [ "$SID" = "$FOCUSED_SPACE" ]; then
  sketchybar --set "$NAME" \
    background.color=0xFFFAB387 \
    label.color=0xFF11111B
else
  sketchybar --set "$NAME" \
    background.color=0xFF11111B \
    label.color=0xFFCDD6F4
fi
