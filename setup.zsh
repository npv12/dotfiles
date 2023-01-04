#!/bin/sh

# Install all deps
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh # Rust
curl https://getmic.ro | zsh # Micro
curl -sS https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | bash # Zoxide

echo "Linking files"
ln -s ~/dotfiles/gitconfig ~/.gitconfig
ln -s ~/dotfiles/icons ~/.icons
ln -s ~/dotfiles/bat ~/.config/bat
ln -s ~/dotfiles/micro-config ~/.config/micro
ln -s ~/dotfiles/zsh ~/.config/zsh
ln -s ~/dotfiles/zshrc ~/.zshrc
ln -s ~/dotfiles/zshenv ~/.zshenv