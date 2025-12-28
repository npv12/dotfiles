#!/bin/bash

MIC_VOLUME=$(osascript -e 'input volume of (get volume settings)')

# Ensure MIC_VOLUME is numeric
if ! [[ $MIC_VOLUME =~ ^[0-9]+$ ]]; then
	echo "Error: MIC_VOLUME is not numeric: $MIC_VOLUME"
	exit 1
fi

# Check for mute
if [[ $MIC_VOLUME -eq 0 ]]; then
	# Mic is muted
	sketchybar -m --set mic \
		icon="󰍭" \
		icon.color=0xFFF38BA8 \
		label="$MIC_VOLUME"
else
	# Mic is active
	ICON="󰍬"
	COLOR=0xFFCDD6F4

	if [[ $MIC_VOLUME -ge 80 ]]; then
		COLOR=0xFF89B4FA
	elif [[ $MIC_VOLUME -ge 30 ]]; then
		COLOR=0xFFA6E3A1
	else
		COLOR=0xFFFFC6A1
	fi

	sketchybar -m --set mic \
		icon="$ICON" \
		icon.color="$COLOR" \
		label="$MIC_VOLUME"
fi
