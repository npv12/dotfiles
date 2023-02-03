#!/usr/bin/env bash

## Author : Aditya Shakya (adi1090x)
## Github : @adi1090x
#
## Rofi   : Power Menu

# Current Theme
dir="$HOME/.config/rofi/power/"
theme='style'

# CMDs
lastlogin="`last $USER | head -n1 | tr -s ' ' | cut -d' ' -f5,6,7`"
uptime="`uptime -p | sed -e 's/up //g'`"
host=`hostname`

# Options
hibernate=''
shutdown=''
reboot=''
lock=''
suspend=''
logout=''
yes=''
no=''

# Rofi CMD
rofi_cmd() {
    rofi -dmenu \
    -p " $USER@$host" \
    -mesg " Uptime: $uptime" \
    -theme ${dir}/${theme}.rasi
}

# Confirmation CMD
confirm_cmd() {
    rofi -theme-str 'window {location: center; anchor: center; fullscreen: false; width: 350px;}' \
    -theme-str 'mainbox {orientation: vertical; children: [ "message", "listview" ];}' \
    -theme-str 'listview {columns: 2; lines: 1;}' \
    -theme-str 'element-text {horizontal-align: 0.5;}' \
    -theme-str 'textbox {horizontal-align: 0.5;}' \
    -dmenu \
    -p 'Confirmation' \
    -mesg 'Are you Sure?' \
    -theme ${dir}/${theme}.rasi
}

# Ask for confirmation
confirm_exit() {
    echo -e "$yes\n$no" | confirm_cmd
}

# Pass variables to rofi dmenu
run_rofi() {
    echo -e "$lock\n$suspend\n$logout\n$hibernate\n$reboot\n$shutdown" | rofi_cmd
}

lock_screen() {
	swaylock \
		--hide-keyboard-layout \
		--indicator-radius 100 \
		--indicator-thickness 7 \
		--ring-color cba6f7 \
		--ring-ver-color 89b4fa \
		--ring-wrong-color f38ba8 \
		--ring-clear-color a6e3a1 \
		--key-hl-color 1e1e2e \
		--bs-hl-color eba0ac \
		--text-color 11111b \
		--text-caps-lock-color 11111b \
		--line-color 00000000 \
		--line-ver-color 00000000 \
		--line-wrong-color 00000000 \
		--line-clear-color 00000000 \
		--separator-color 00000000 \
		--inside-color cba6f7 \
		--inside-ver-color 89b4fa\
		--inside-wrong-color f38ba8 \
		--inside-clear-color a6e3a1 \
		--color 1e1e2e80 \
		--clock \
		--indicator
}

# Execute Command
run_cmd() {
    if [[ $1 == '--shutdown' ]]; then
		selected="$(confirm_exit)"
        if [[ "$selected" == "$yes" ]]; then
            systemctl poweroff
        else
            exit 0
        fi
	elif [[ $1 == '--reboot' ]]; then
		selected="$(confirm_exit)"
		if [[ "$selected" == "$yes" ]]; then
			systemctl reboot
		else
			exit 0
		fi
	elif [[ $1 == '--hibernate' ]]; then
		systemctl hibernate
		lock_screen
	elif [[ $1 == '--suspend' ]]; then
		systemctl suspend
		lock_screen
	elif [[ $1 == '--logout' ]]; then
		loginctl kill-session self
	elif [[ $1 == '--lock' ]]; then
		lock_screen
    fi
}

# Actions
chosen="$(run_rofi)"
case ${chosen} in
    $shutdown)
        run_cmd --shutdown
    ;;
    $reboot)
        run_cmd --reboot
    ;;
    $hibernate)
        run_cmd --hibernate
    ;;
    $lock)
        run_cmd --lock
    ;;
    $suspend)
        run_cmd --suspend
    ;;
    $logout)
        run_cmd --logout
    ;;
esac