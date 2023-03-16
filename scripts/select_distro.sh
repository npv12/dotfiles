#!/usr/bin/env bash

echo 'Choose your distro: '
options=("Gnome" "KDE" "hyprland" "Quit")
select opt in "${options[@]}"
do
    case $opt in
        "Gnome")
            ${DIR}/gnome.zsh
            break
            ;;
        "KDE")
            ${DIR}/kde.zsh
            break
            ;;
        "hyprland")
            ${DIR}/hyprland.zsh
            break
            ;;
        "Quit")
            break
            ;;
        *) echo "invalid option $REPLY";;
    esac
done