#!/usr/bin/env zsh

set -e # Exit immediately if a command exits with a non-zero status.

# --- Detect OS and run appropriate setup ---

echo "Detecting operating system..."

case "$OSTYPE" in
darwin*)
	echo "macOS detected. Running Mac setup..."
	# It is assumed that Homebrew is installed
	$HOME/dotfiles/common/link.sh
	$HOME/dotfiles/mac/install.sh
	$HOME/dotfiles/mac/link.sh
	;;

linux*)
	if grep -qi 'microsoft' /proc/version; then
		echo "WSL (Windows Subsystem for Linux) detected. Running WSL setup..."
		$HOME/dotfiles/common/link.sh
		$HOME/dotfiles/wsl/install.sh
		$HOME/dotfiles/linux/link.sh # Assumes WSL uses linux-specific configs too
	else
		echo "Linux detected. Running Linux setup..."
		# It is assumed that paru (Arch User Repository helper) is installed
		$HOME/dotfiles/common/link.sh
		$HOME/dotfiles/linux/install.sh
		$HOME/dotfiles/linux/link.sh
	fi
	;;

*)
	echo "Unsupported operating system: $OSTYPE"
	exit 1
	;;
esac

echo "Setup complete!"
