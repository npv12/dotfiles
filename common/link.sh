#!/usr/bin/env bash

COMMON_DIR="$HOME/dotfiles/common"
CONFIG_DIR="$HOME/.config"

# --- Define files and directories to link ---
# Format: "source;destination"
declare -a links=(
	# ZSH
	"$COMMON_DIR/zsh/zshrc;$HOME/.zshrc"
	"$COMMON_DIR/zsh/zshenv;$HOME/.zshenv"
	"$COMMON_DIR/zsh/zprofile;$HOME/.zprofile"
	"$COMMON_DIR/zsh/config;$CONFIG_DIR/zsh"
	# Claude / Codex
	"$COMMON_DIR/claude/CLAUDE.md;$HOME/.claude/CLAUDE.md"
	"$COMMON_DIR/claude/CLAUDE.md;$HOME/.codex/AGENTS.md"
	# Opencode
	"$COMMON_DIR/opencode/opencode.json;$CONFIG_DIR/opencode.json"
	"$COMMON_DIR/opencode/AGENTS.md;$CONFIG_DIR/AGENTS.md"
	"$COMMON_DIR/opencode/agent;$CONFIG_DIR/opencode/agent"
	"$COMMON_DIR/opencode/skills;$CONFIG_DIR/opencode/skills"
	# Git
	"$COMMON_DIR/git/gitconfig;$HOME/.gitconfig"
	"$COMMON_DIR/git/gitignore;$HOME/.gitignore"
	# Misc Apps
	"$COMMON_DIR/gdu;$CONFIG_DIR/gdu"
	"$COMMON_DIR/tmux/tmux.conf;$HOME/.tmux.conf"
	"$COMMON_DIR/zed/keymap.json;$CONFIG_DIR/zed/keymap.json"
	"$COMMON_DIR/zed/settings.json;$CONFIG_DIR/zed/settings.json"
)

# --- Define conditional links (based on command existence) ---
# Format: "command;source;destination"
declare -a conditional_links=(
	"ghostty;$COMMON_DIR/ghostty;$CONFIG_DIR/ghostty"
	"alacritty;$COMMON_DIR/alacritty;$CONFIG_DIR/alacritty"
	"kitty;$COMMON_DIR/kitty;$CONFIG_DIR/kitty"
	"nvim;$COMMON_DIR/nvim;$CONFIG_DIR/nvim"
	"bat;$COMMON_DIR/bat;$CONFIG_DIR/bat"
	"bottom;$COMMON_DIR/bottom;$CONFIG_DIR/bottom"
	"micro;$COMMON_DIR/micro;$CONFIG_DIR/micro"
)

# --- Common function to process a link ---
process_link() {
	local source="$1"
	local destination="$2"
	local message="${3:-Linking}"

	mkdir -p "$(dirname "$destination")"

	if [[ -e $destination && ! -L $destination ]]; then
		echo "Backing up $destination to ${destination}.bak"
		mv "$destination" "${destination}.bak"
	fi

	if [[ -L $destination ]]; then
		rm "$destination"
	fi

	echo "$message $source -> $destination"
	ln -s "$source" "$destination"
}

# --- Process unconditional links ---
echo "Processing common dotfiles..."
for link_pair in "${links[@]}"; do
	IFS=';' read -r source destination <<<"$link_pair"
	process_link "$source" "$destination"
done

# --- Process conditional links ---
echo "Processing conditional links..."
for link_info in "${conditional_links[@]}"; do
	IFS=';' read -r command_name source destination <<<"$link_info"

	if command -v "$command_name" &>/dev/null; then
		process_link "$source" "$destination" "Linking (found $command_name)"
	else
		echo "Skipping $command_name link, command not found."
	fi
done

echo "Common linking complete."
