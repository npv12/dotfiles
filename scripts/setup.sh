#!/usr/bin/env zsh

# If os is darwin, 
if [[ "$OSTYPE" == "darwin"* ]]; then
    # It is assumed that brew is installed
    $HOME/dotfiles/common/link.sh
    $HOME/dotfiles/mac/install.sh
    $HOME/dotfiles/mac/link.sh
fi
