#!/bin/bash

MIC_VOLUME=$(osascript -e 'input volume of (get volume settings)')
MUTED=$(osascript -e 'input muted of (get volume settings)')

if [[ "$MUTED" == "true" || $MIC_VOLUME -eq 0 ]]; then
  # Muted: use Nerd Font icon and red color
  sketchybar -m --set mic icon="󰍭" icon.color=0xFFF38BA8 label="$MIC_VOLUME"
elif [[ $MIC_VOLUME -ge 80 ]]; then
  sketchybar -m --set mic icon="󰍬" icon.color=0xFFCDD6F4 label="$MIC_VOLUME"
elif [[ $MIC_VOLUME -ge 30 ]]; then
  sketchybar -m --set mic icon="󰍬" icon.color=0xFFCDD6F4 label="$MIC_VOLUME"
else
  sketchybar -m --set mic icon="󰍬" icon.color=0xFFCDD6F4 label="$MIC_VOLUME"
fi
