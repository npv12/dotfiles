#!/usr/bin/env bash

LINUX_DIR="$HOME/dotfiles/linux"
CONFIG_DIR="$HOME/.config"

# --- Define files and directories to link ---
# Format: "source;destination"
declare -a links=(
	"$LINUX_DIR/hypr;$CONFIG_DIR/hypr"
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

# --- Process links ---
echo "Processing Linux dotfiles..."
for link_pair in "${links[@]}"; do
	IFS=';' read -r source destination <<<"$link_pair"
	process_link "$source" "$destination"
done

echo "Linux linking complete."
