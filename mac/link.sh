#!/usr/bin/env zsh

MAC_DIR="$HOME/dotfiles/mac"
CONFIG_DIR="$HOME/.config"

rm -rf $CONFIG_DIR/aerospace \
    $CONFIG_DIR/aerospace-space \
    $CONFIG_DIR/sketchybar \
    ~/.zprofile

ln -s $MAC_DIR/aerospace $CONFIG_DIR/aerospace
ln -s $MAC_DIR/aerospace-space $CONFIG_DIR/aerospace-space

ln -s $MAC_DIR/sketchybar $CONFIG_DIR/sketchybar
ln -s $COMMON_DIR/zsh/zprofile ~/.zprofile

# Correct alacritty for macOS
cp -f ~/.config/alacritty/mac.toml ~/.config/alacritty/alacritty.toml
