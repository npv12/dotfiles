#!/usr/bin/env bash

echo 'Choose your distro: '
options=("Gnome" "KDE" "hyprland" "Quit")
select opt in "${options[@]}"
do
    case $opt in
        "Gnome")
            ${DIR}/scripts/gnome.zsh
            break
            ;;
        "KDE")
            ${DIR}/scripts/kde.zsh
            break
            ;;
        "hyprland")
            ${DIR}/scripts/hyprland.zsh
            break
            ;;
        "Quit")
            break
            ;;
        *) echo "invalid option $REPLY";;
    esac
done