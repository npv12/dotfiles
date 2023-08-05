#!/usr/bin/env zsh

export DIR=~/dotfiles/

# Install all deps
paru -S fd ripgrep duf exa micro bat bottom zoxide ueberzug neovim pyright

# Fonts
paru -S adobe-source-code-pro-fonts noto-fonts terminus-font
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh # Rust

echo "Removing previous symlinks"
rm -rf ~/.gitconfig ~/.icons ~/.config/bat ~/.config/bottom ~/.config/gdu ~/.config/micro \
    ~/.config/nvim ~/.config/zsh ~/.zshrc ~/.zshenv ~/.cargo ~/.virtualenvs ~/.local/share/blackbox ~/.config/mimeapps.list

echo "Linking files"
ln -s ${DIR}/gitconfig ~/.gitconfig
ln -s ${DIR}/icons ~/.icons
ln -s ${DIR}/bat ~/.config/bat
ln -s ${DIR}/bottom ~/.config/bottom
mkdir -p ~/.config/gdu && ln -s ${DIR}/gdu.yaml ~/.config/gdu/gdu.yaml
ln -s ${DIR}/micro ~/.config/micro
ln -s ${DIR}/nvim ~/.config/nvim
ln -s ${DIR}/zsh ~/.config/zsh
ln -s ${DIR}/zshrc ~/.zshrc
ln -s ${DIR}/zshenv ~/.zshenv
ln -s ${DIR}/blackbox ~/.local/share/blackbox
ln -s ${DIR}/mimeapps.list ~/.config/mimeapps.list
ln -s ${DIR}/fonts ~/.local/share/fonts

echo "Linking bins"
ln -s /Coding/bins/cargo ~/.cargo
ln -s /Coding/bins/virtualenvs ~/.virtualenvs
ln -s /Coding/bins/nvm .nvm
ln -s /Coding/bins/yarn .yarn/bin

bash ${DIR}/scripts/select_distro.sh
