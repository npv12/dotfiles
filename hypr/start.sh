#!/bin/bash

# Export all required variables
export SSH_AUTH_SOCK=/run/user/1000/keyring/ssh
export BROWSER=microsoft-edge-stable

# Hyprland
export XDG_CURRENT_DESKTOP=Hyprland
export XDG_SESSION_TYPE=wayland
export XDG_SESSION_DESKTOP=Hyprland
export XDG_DATA_DIRS=/home/npv12/.local/share/flatpak/exports/share:/var/lib/flatpak/exports/share:/usr/share

# GTK themes
export GTK_THEME=Lavanda-Dark-Compact-dark
export GTK_ICON_THEME=Colloid-nord
export XCURSOR_THEME=Bibata-Modern-Ice

# Wayland stuff
export MOZ_ENABLE_WAYLAND=1
export QT_QPA_PLATFORM=wayland
export SDL_VIDEODRIVER=wayland
export _JAVA_AWT_WM_NONREPARENTING=1

# Start hyprland finally
exec Hyprland
