#!/usr/bin/env bash

SSID=$(~/Applications/wifi-unredactor.app/Contents/MacOS/wifi-unredactor | jq -r '.ssid')

# Truncate SSID if longer than 20 characters
MAX_LENGTH=10
if [ ${#SSID} -gt $MAX_LENGTH ]; then
	SSID="${SSID:0:MAX_LENGTH}..."
fi
ICON=""

sketchybar --set "$NAME" \
	icon="$ICON" \
	icon.color="0xFFF38BA8" \
	label="$SSID"
