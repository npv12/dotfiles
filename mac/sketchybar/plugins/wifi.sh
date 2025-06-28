SSID=$(ipconfig getsummary $(networksetup -listallhardwareports | awk '/Hardware Port: Wi-Fi/{getline; print $2}') | awk -F ' SSID : ' '/ SSID : / {print $2}')

if [[ $SSID -eq "" ]]; then
    sketchybar --set $NAME \
        icon= icon.color=0xFFF38BA8 \
        label="$SSID"
else
    sketchybar --set $NAME \
        icon= icon.color=0xFFFEFEFE \
        label="$SSID"
fi
