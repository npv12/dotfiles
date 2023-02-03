#!/bin/bash

# Export all required variables
export SSH_AUTH_SOCK=/run/user/1000/keyring/ssh
export BROWSER=brave-browser

# Hyprland
export XDG_CURRENT_DESKTOP=Hyprland
export XDG_SESSION_TYPE=wayland
export XDG_SESSION_DESKTOP=Hyprland

# GTK themes
export GTK_THEME=Catppuccin-Mocha-Compact-Maroon-Dark
export GTK_ICON_THEME=Fluent-red
export XCURSOR_THEME=Bibata-Modern-Ice

# Start hyprland finally
exec Hyprland
