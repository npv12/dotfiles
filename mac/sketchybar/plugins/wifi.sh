SSID=$(~/Applications/wifi-unredactor.app/Contents/MacOS/wifi-unredactor | jq -r '.ssid')

if [[ $SSID -eq "" ]]; then
    sketchybar --set $NAME \
        icon= icon.color=0xFFF38BA8 \
        label="$SSID"
else
    sketchybar --set $NAME \
        icon= icon.color=0xFFFEFEFE \
        label="$SSID"
fi
