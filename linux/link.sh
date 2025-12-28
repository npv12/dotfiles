#!/usr/bin/env bash

LINUX_DIR="$HOME/dotfiles/linux"
CONFIG_DIR="$HOME/.config"

rm -rf "$CONFIG_DIR"/hypr

echo "Linking hyprland config..."

ln -s "$LINUX_DIR"/hypr "$CONFIG_DIR"/hypr
