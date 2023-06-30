#!/bin/sh
getDefaultSink() {
    defaultSink=$(pactl info | awk -F : '/Default Sink:/{print $2}')
    description=$(pactl list sinks | sed -n "/${defaultSink}/,/Description/p; /Description/q" | sed -n 's/^.*Description: \(.*\)$/\1/p')
    echo "${description}"
}

getDefaultSource() {
    defaultSource=$(pactl info | awk -F : '/Default Source:/{print $2}')
    description=$(pactl list sources | sed -n "/${defaultSource}/,/Description/p; /Description/q" | sed -n 's/^.*Description: \(.*\)$/\1/p')
    echo "${description}"
}

is_mic_muted() {
    mic_name="$(getDefaultSink)"

    pactl list sources | \
        awk -v mic_name="${mic_name}" '{
            if ($0 ~ "Name: " mic_name) {
                matched_mic_name = 1;
            } else if (matched_mic_name && /Mute/) {
                print $2;
                exit;
            }
        }'
}

get_mic_status() {
    is_muted="$(is_mic_muted)"

    if [ "${is_muted}" = "yes" ]; then
        printf "%s\n" "#1"
    else
        printf "%s\n" "#2"
    fi
}

listen() {
    get_mic_status

    LANG=EN; pactl subscribe | while read -r event; do
        if printf "%s\n" "${event}" | grep --quiet "source" || printf "%s\n" "${event}" | grep --quiet "server"; then
            get_mic_status
        fi
    done
}

toggle() {
    pactl set-source-mute @DEFAULT_SOURCE@ toggle
}

case "$1" in
    --toggle)
        toggle
        ;;
    *)
        listen
        ;;
esac