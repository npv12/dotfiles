#!/usr/bin/env bash

PERCENTAGE=$(pmset -g batt | grep -Eo "\d+%" | cut -d% -f1)
CHARGING=$(pmset -g batt | grep 'AC Power')

if [ "$PERCENTAGE" = "" ]; then
	exit 0
fi

case ${PERCENTAGE} in
[8-9][0-9] | 100)
	ICON=""
	ICON_COLOR=0xFFA6E3A1
	;;
[6-7][0-9])
	ICON=""
	ICON_COLOR=0xFFA6E3A1
	;;
[3-5][0-9])
	ICON=""
	ICON_COLOR=0xFFF9E2AF
	;;
[1-2][0-9])
	ICON=""
	ICON_COLOR=0xfffab387
	;;
[0-9])
	ICON=""
	ICON_COLOR=0xfff38ba8
	;;
esac

if [[ $CHARGING != "" ]]; then
	ICON=""
	ICON_COLOR=0xff94e2d5
fi

sketchybar --set "$NAME" \
	icon="$ICON" \
	label="${PERCENTAGE}%" \
	icon.color="$ICON_COLOR"
