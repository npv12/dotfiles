#!/usr/bin/env bash

MAC_DIR="$HOME/dotfiles/mac"
CONFIG_DIR="$HOME/.config"

rm -rf "$CONFIG_DIR"/aerospace \
	"$CONFIG_DIR"/aerospace-space \
	"$CONFIG_DIR"/sketchybar \
	~/.zprofile \
	"$CONFIG_DIR"/yabai \
	"$CONFIG_DIR"/skhd

if command -v aerospace >/dev/null 2>&1; then
	ln -s "$MAC_DIR"/aerospace "$CONFIG_DIR"/aerospace
	ln -s "$MAC_DIR"/aerospace-swipe "$CONFIG_DIR"/aerospace-swipe
fi

if command -v yabai >/dev/null 2>&1; then
	ln -s "$MAC_DIR"/yabai "$CONFIG_DIR"/yabai
	ln -s "$MAC_DIR"/skhd "$CONFIG_DIR"/skhd
fi

ln -s "$MAC_DIR"/sketchybar "$CONFIG_DIR"/sketchybar
ln -s "$COMMON_DIR"/zsh/zprofile ~/.zprofile

# Correct alacritty for macOS
if command -v alacritty &>/dev/null; then
	ln -s "$MAC_DIR"/alacritty "$CONFIG_DIR"/alacritty
	xattr -rd com.apple.quarantine /Applications/Alacritty.app
fi

find ~/.ssh -type f \( -name "id_*" ! -name "*.pub" ! -name "config" ! -name "known_hosts" \) | while read -r key; do
	echo "Adding key: $key"
	ssh-add "$key"
done
