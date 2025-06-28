#!/usr/bin/env bash

# Ensure this script is executable:
# chmod +x ~/.config/sketchybar/plugins/aerospace.sh

FOCUSED_WORKSPACE=$(aerospace list-workspaces --focused)

if [ "$1" = "$FOCUSED_WORKSPACE" ]; then
  sketchybar --set $NAME background.color=0xFFFAB387 label.color=0xFF11111B
else
  sketchybar --set $NAME background.color=0xFF11111B label.color=0xFFCDD6F4
fi
