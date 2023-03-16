#!/usr/bin/env zsh

export DIR=~/dotfiles/scripts/
# Install all deps
# paru -S fd ripgrep duf exa micro bat bottom zoxide ueberzug neovim pyright
# curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh # Rust

echo "Removing previous symlinks"
rm -rf ~/.gitconfig ~/.icons ~/.config/bat ~/.config/bottom ~/.config/gdu ~/.config/micro ~/.config/nvim ~/.config/zsh ~/.zshrc ~/.zshenv ~/.cargo ~/.virtualenvs

echo "Linking files"
ln -s ~/dotfiles/gitconfig ~/.gitconfig
ln -s ~/dotfiles/icons ~/.icons
ln -s ~/dotfiles/bat ~/.config/bat
ln -s ~/dotfiles/bottom ~/.config/bottom
mkdir -p ~/.config/gdu
ln -s ~/dotfiles/gdu.yaml ~/.config/gdu/gdu.yaml
ln -s ~/dotfiles/micro ~/.config/micro
ln -s ~/dotfiles/nvim ~/.config/nvim
ln -s ~/dotfiles/zsh ~/.config/zsh
ln -s ~/dotfiles/zshrc ~/.zshrc
ln -s ~/dotfiles/zshenv ~/.zshenv
ln -s /Coding/bins/cargo ~/.cargo
ln -s /Coding/bins/virtualenvs ~/.virtualenvs

bash ${DIR}/select_distro.sh
