#!/usr/bin/env bash

SSID=$(~/Applications/wifi-unredactor.app/Contents/MacOS/wifi-unredactor | jq -r '.ssid')
ICON=""

sketchybar --set "$NAME" \
	icon="$ICON" \
	icon.color="0xFFF38BA8" \
	label="$SSID"
