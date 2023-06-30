#!/usr/bin/env bash

playerctlstatus=$(playerctl status 2> /dev/null)

if [[ $playerctlstatus =~  "Playing" ]]; then
    echo "$(playerctl metadata --all-players --format '{{ title }} - {{ artist }}')" | sed 's/&/&amp;/g'
else
    echo ""
fi