#!/usr/bin/env zsh

export DIR=~/dotfiles/

# Install all deps
# If paru exists
if command -v paru &> /dev/null; then 
    paru -S fd ripgrep duf eza micro bat bottom direnv zoxide pinentry ueberzug tmux neovim pyright

    # Fonts
    paru -S adobe-source-code-pro-fonts noto-fonts terminus-font
fi

# Debian
if command -v apt &> /dev/null; then
    sudo apt install -y gpg wget curl

    # Eza
    sudo mkdir -p /etc/apt/keyrings
    wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | sudo gpg --dearmor -o /etc/apt/keyrings/gierens.gpg
    echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" | sudo tee /etc/apt/sources.list.d/gierens.list
    sudo chmod 644 /etc/apt/keyrings/gierens.gpg /etc/apt/sources.list.d/gierens.list
    sudo apt update
    sudo apt install -y eza

    sudo apt install fd-find ripgrep direnv pinentry-tty duf micro bat zoxide ueberzug neovim tmux pass pass-otp
fi 
git clone https://github.com/NvChad/NvChad ~/.config/nvim --depth 1 && nvim
# curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh # Rust

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
ln -s ${DIR}/tmux.conf .tmux.conf

# Not required for wsl
# echo "Linking bins"
# ln -s /Coding/bins/cargo ~/.cargo
# ln -s /Coding/bins/virtualenvs ~/.virtualenvs
# ln -s /Coding/bins/nvm .nvm
# ln -s /Coding/bins/yarn .yarn/bin

bash ${DIR}/scripts/select_distro.sh
