#!/usr/bin/env zsh

# Install all deps
paru -S "fd ripgrep duf exa micro bat bottom zoxide ueberzug neovim pyright"
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh # Rust

echo "Linking files"
ln -s ~/dotfiles/gitconfig ~/.gitconfig
ln -s ~/dotfiles/icons ~/.icons
ln -s ~/dotfiles/bat ~/.config/bat
ln -s ~/dotfiles/bottom ~/.config/bottom
ln -s ~/dotfiles/gdu.yaml ~/.config/gdu/gdu.yaml
ln -s ~/dotfiles/micro-config ~/.config/micro
ln -s ~/dotfiles/nvim ~/.config/nvim
ln -s ~/dotfiles/zsh ~/.config/zsh
ln -s ~/dotfiles/zshrc ~/.zshrc
ln -s ~/dotfiles/zshenv ~/.zshenv

# Installing themes
./setup_themes.sh