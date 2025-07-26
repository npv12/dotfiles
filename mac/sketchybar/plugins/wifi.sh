SSID=$(system_profiler SPAirPortDataType | awk '/Current Network/ {getline; $1=$1; print $0 | "tr -d \":\""; exit}')

if [[ $SSID -eq "" ]]; then
    sketchybar --set $NAME \
        icon= icon.color=0xFFF38BA8 \
        label="$SSID"
else
    sketchybar --set $NAME \
        icon= icon.color=0xFFFEFEFE \
        label="$SSID"
fi
