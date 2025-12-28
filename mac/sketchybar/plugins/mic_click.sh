#!/bin/bash

MIC_VOLUME=$(osascript -e 'input volume of (get volume settings)')
if [[ $MIC_VOLUME =~ ^[0-9]+$ ]]; then
	if [[ $MIC_VOLUME -lt 100 ]]; then
		osascript -e 'set volume input volume 100'
		NEW_VOLUME=$(osascript -e 'input volume of (get volume settings)')
		sketchybar -m --set mic icon=" $NEW_VOLUME"
	elif [[ $MIC_VOLUME -gt 0 ]]; then
		osascript -e 'set volume input volume 0'
		NEW_VOLUME=$(osascript -e 'input volume of (get volume settings)')
		sketchybar -m --set mic icon=" $NEW_VOLUME"
	fi
else
	echo "Failed to get mic volume. Got: $MIC_VOLUME"
fi
