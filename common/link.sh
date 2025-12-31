#!/usr/bin/env bash

COMMON_DIR="$HOME/dotfiles/common"
CONFIG_DIR="$HOME/.config"

rm -rf ~/.gitconfig ~/.gitignore ~/.zshrc ~/.zshenv ~/.tmux.conf ~/.opencode "$CONFIG_DIR"/alacritty \
	"$CONFIG_DIR"/bat "$CONFIG_DIR"/bottom "$CONFIG_DIR"/micro "$CONFIG_DIR"/zed \
	"$CONFIG_DIR"/zsh "$CONFIG_DIR"/gdu "$CONFIG_DIR"/kitty "$CONFIG_DIR"/ghostty

mkdir -p ~/.config/zed
mkdir -p ~/.claude
mkdir -p ~/.opencode

# Link ZSH
ln -s "$COMMON_DIR"/zsh/zshrc ~/.zshrc
ln -s "$COMMON_DIR"/zsh/zshenv ~/.zshenv
ln -s "$COMMON_DIR"/zsh/zprofile ~/.zprofile
ln -s "$COMMON_DIR"/zsh/config "$CONFIG_DIR"/zsh

# Link claude
ln -s "$COMMON_DIR"/claude/CLAUDE.md ~/.claude/CLAUDE.md
ln -s "$COMMON_DIR"/claude/CLAUDE.md ~/.codex/AGENTS.md

# Link opencode
ln -s "$COMMON_DIR"/opencode/opencode.json ~/.opencode/opencode.json
ln -s "$COMMON_DIR"/opencode/AGENTS.md ~/.opencode/AGENTS.md

# Link Git
ln -s "$COMMON_DIR"/git/gitconfig ~/.gitconfig
ln -s "$COMMON_DIR"/git/gitignore ~/.gitignore

# Link Apps
if command -v ghostty &>/dev/null; then
	ln -s "$COMMON_DIR/ghostty" "$CONFIG_DIR/ghostty"
fi

if command -v alacritty &>/dev/null; then
	ln -s "$COMMON_DIR/alacritty" "$CONFIG_DIR/alacritty"
fi

if command -v kitty &>/dev/null; then
	ln -s "$COMMON_DIR/kitty" "$CONFIG_DIR/kitty"
fi

ln -s "$COMMON_DIR"/bat "$CONFIG_DIR"/bat
ln -s "$COMMON_DIR"/bottom "$CONFIG_DIR"/bottom
ln -s "$COMMON_DIR"/micro "$CONFIG_DIR"/micro
ln -s "$COMMON_DIR"/gdu "$CONFIG_DIR"/gdu
ln -s "$COMMON_DIR"/tmux/tmux.conf ~/.tmux.conf
ln -s "$COMMON_DIR"/zed/keymap.json "$CONFIG_DIR"/zed/keymap.json
ln -s "$COMMON_DIR"/zed/settings.json "$CONFIG_DIR"/zed/settings.json
