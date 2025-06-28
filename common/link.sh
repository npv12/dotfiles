#!/usr/bin/env zsh

COMMON_DIR="$HOME/dotfiles/common"
CONFIG_DIR="$HOME/.config"

rm -rf ~/.gitconfig  ~/.gitignore ~/.zshrc ~/.zshenv ~/.tmux.conf $CONFIG_DIR/alacritty \
    $CONFIG_DIR/bat $CONFIG_DIR/bottom $CONFIG_DIR/micro $CONFIG_DIR/zed \
    $CONFIG_DIR/zsh

# Link ZSH
ln -s $COMMON_DIR/zsh/zshrc ~/.zshrc
ln -s $COMMON_DIR/zsh/zshenv ~/.zshenv
ln -s $COMMON_DIR/zsh/config $CONFIG_DIR/zsh

# Link Git
ln -s $COMMON_DIR/git/gitconfig ~/.gitconfig
ln -s $COMMON_DIR/git/gitignore ~/.gitignore

# Link Apps
ln -s $COMMON_DIR/alacritty $CONFIG_DIR/alacritty
ln -s $COMMON_DIR/bat $CONFIG_DIR/bat
ln -s $COMMON_DIR/bottom $CONFIG_DIR/bottom
ln -s $COMMON_DIR/micro $CONFIG_DIR/micro
ln -s $COMMON_DIR/tmux ~/.tmux.conf
ln -s $COMMON_DIR/zed/keymap.json $CONFIG_DIR/zed/keymap.json
ln -s $COMMON_DIR/zed/settings.json $CONFIG_DIR/zed/settings.json
