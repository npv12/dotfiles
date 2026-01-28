#!/usr/bin/env bash

SSID=$(~/Applications/wifi-unredactor.app/Contents/MacOS/wifi-unredactor | jq -r '.ssid')
ICON=""

# Check if WiFi retrieval failed
if [ "$SSID" = "failed to retrieve SSID" ]; then
	LABEL="No Wifi"
	ICON_COLOR="0xFFFFFFFF"
else
	# Truncate SSID if longer than 10 characters
	MAX_LENGTH=10
	if [ ${#SSID} -gt $MAX_LENGTH ]; then
		SSID="${SSID:0:MAX_LENGTH}..."
	fi
	LABEL="$SSID"
	ICON_COLOR="0xFFF38BA8"
fi

sketchybar --set "$NAME" \
	icon="$ICON" \
	icon.color="$ICON_COLOR" \
	label="$LABEL"
