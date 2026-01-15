#!/usr/bin/env bash

MAC_DIR="$HOME/dotfiles/mac"
CONFIG_DIR="$HOME/.config"

# --- Define files and directories to link ---
# Unconditional links specific to macOS
# Format: "source;destination"
declare -a links=(
	"$MAC_DIR/sketchybar;$CONFIG_DIR/sketchybar"
)

# --- Define conditional links (based on command existence) ---
# Format: "command;source;destination"
declare -a conditional_links=(
	"aerospace;$MAC_DIR/aerospace;$CONFIG_DIR/aerospace"
	"aerospace;$MAC_DIR/aerospace-swipe;$CONFIG_DIR/aerospace-swipe"
	"yabai;$MAC_DIR/yabai;$CONFIG_DIR/yabai"
	"yabai;$MAC_DIR/skhd;$CONFIG_DIR/skhd"
	"alacritty;$MAC_DIR/alacritty;$CONFIG_DIR/alacritty"
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
echo "Processing macOS dotfiles..."
for link_pair in "${links[@]}"; do
	IFS=';' read -r source destination <<<"$link_pair"
	process_link "$source" "$destination"
done

# --- Process conditional links ---
echo "Processing conditional macOS links..."
for link_info in "${conditional_links[@]}"; do
	IFS=';' read -r command_name source destination <<<"$link_info"

	if command -v "$command_name" &>/dev/null; then
		process_link "$source" "$destination" "Linking (found $command_name)"
	else
		echo "Skipping $command_name link, command not found."
	fi
done

# --- macOS specific commands ---
echo "Running macOS-specific commands..."

# Correct alacritty for macOS quarantine
if command -v alacritty &>/dev/null; then
	echo "Removing quarantine attribute from Alacritty.app"
	xattr -rd com.apple.quarantine /Applications/Alacritty.app
fi

# Add SSH keys
echo "Adding SSH keys to ssh-agent..."
find ~/.ssh -type f \( -name "id_*" ! -name "*.pub" ! -name "config" ! -name "known_hosts" \) | while read -r key; do
	echo "Adding key: $key"
	ssh-add -q "$key" </dev/null
done

echo "macOS linking complete."
