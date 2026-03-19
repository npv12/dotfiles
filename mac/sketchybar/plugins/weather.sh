#!/bin/bash

sketchybar --set "$NAME" \
	label="..." \
	icon.color=0xFFFEFEFE

LOCATION="ichchhapore"

# Fetch weather data
WEATHER_JSON=$(curl -s "https://wttr.in/${LOCATION}?format=j1")

# Fallback if empty
if [ -z "$WEATHER_JSON" ]; then
	sketchybar --set "$NAME" label="No data"
	exit 1
fi

# Extract data
TEMPERATURE=$(echo "$WEATHER_JSON" | jq -r '.data.current_condition[0].temp_C')
WEATHER_CODE=$(echo "$WEATHER_JSON" | jq -r '.data.current_condition[0].weatherCode')

# Choose icon
case "$WEATHER_CODE" in
113)
	ICON=""
	;; # Sunny
116 | 119 | 122)
	ICON="󰅟"
	;; # Cloudy
143 | 248 | 260)
	ICON=""
	;; # Fog
179 | 182 | 185 | 281 | 284 | 311 | 314 | 317 | 350 | 362 | 374 | 377)
	ICON=""
	;; # Snow
176 | 263 | 266 | 293 | 296 | 299 | 302 | 305 | 308 | 353 | 356 | 359)
	ICON=""
	;; # Rain
200 | 386 | 389)
	ICON=""
	;; # Thunderstorm
392)
	ICON=""
	;; # Snow Showers
*)
	ICON=""
	;; # Default
esac

# Update bar
sketchybar --set "$NAME" \
	label="${TEMPERATURE}°C" \
	icon="$ICON" \
	icon.color="0xFFa6e3a1"
