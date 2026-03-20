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
# It is sometimes under .data and sometimes without .data
if echo "$WEATHER_JSON" | jq -e '.data' >/dev/null 2>&1; then
	WEATHER_JSON=$(echo "$WEATHER_JSON" | jq -c '.data')
fi

# Defensive fallback: if the expected shape isn't present, use a dummy error payload.
if ! echo "$WEATHER_JSON" | jq -e '.current_condition[0].temp_C' >/dev/null 2>&1; then
	# Make a dummy variable for data with 0 kelvin to indicate error. Icon can be changed to red error.
	# Icon is based on weather code, so we need to change the icon to red error.
	WEATHER_JSON='{ "current_condition": [ { "temp_C": -273.15, "weatherCode": 999 } ] }'
fi

TEMPERATURE=$(echo "$WEATHER_JSON" | jq -r '.current_condition[0].temp_C')
WEATHER_CODE=$(echo "$WEATHER_JSON" | jq -r '.current_condition[0].weatherCode')

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
999)
	ICON=""
	;; # Error
*)
	ICON=""
	;; # Default
esac

# Update bar
sketchybar --set "$NAME" \
	label="${TEMPERATURE}°C" \
	icon="$ICON" \
	icon.color="0xFFa6e3a1"
