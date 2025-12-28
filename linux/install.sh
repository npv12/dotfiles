#!/usr/bin/env bash

# If the desktop is not arch, abort
if ! command -v pacman &>/dev/null; then
	echo "This script is only for Arch Linux."
	exit 1
fi

# If the paru is not installed
if ! command -v paru &>/dev/null; then
	sudo pacman -S --needed base-devel git
	git clone https://aur.archlinux.org/paru.git
	cd paru || exit
	makepkg -si
fi

# Install dank shell. This gives a lot of features and packages out of the box
# Themes are also handled by it. Also installs ghostty
curl -fsSL https://install.danklinux.com | sh

# Install packages
paru -S mise zed zen-browser-bin zsh-autosuggestions zsh-syntax-highlighting zsh bat bottom duf \
	code-insiders kubectx zoxide podman-compose eza gpg pass git-delta yazi micro \
	ripgrep gdu speech-dispatcher espeak-ng festival

# Install fonts
paru -S noto-fonts noto-fonts-cjk noto-fonts-emoji noto-fonts-extra ttf-dejavu \
	ttf-liberation ttf-roboto ttf-ubuntu-font-family ttf-inter ttf-ms-fonts

# Change default shell to zsh
chsh -s "$(which zsh)"

# Change default editor to nvim
export EDITOR=zeditor
