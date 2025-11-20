#!/usr/bin/env zsh

LINUX_DIR="$HOME/dotfiles/linux"
CONFIG_DIR="$HOME/.config"

rm -rf $CONFIG_DIR/hypr

ln -s $LINUX_DIR/hypr $CONFIG_DIR/hypr
