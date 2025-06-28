#!/bin/bash

# SketchyBar plugin: Show output volume status

# Get the current output volume (0-100)
VOLUME=$(osascript -e 'output volume of (get volume settings)')
MUTED=$(osascript -e 'output muted of (get volume settings)')

# Choose icon based on mute status and volume level
ICON_MUTED="󰖁"
ICON_LOW="󰕿"
ICON_MEDIUM="󰖀"
ICON_HIGH="󰕾"

if [[ "$MUTED" == "true" ]]; then
  ICON="$ICON_MUTED"
  COLOR="0xFFF38BA8" # Red
elif [[ $VOLUME -ge 80 ]]; then
  ICON="$ICON_HIGH"
  COLOR="0xFFCDD6F4"
elif [[ $VOLUME -ge 30 ]]; then
  ICON="$ICON_MEDIUM"
  COLOR="0xFFCDD6F4"
else
  ICON="$ICON_LOW"
  COLOR="0xFFCDD6F4"
fi

ITEM="${1:-volume}"

sketchybar --set "$ITEM" icon="$ICON" label="$VOLUME" icon.color=$COLOR
