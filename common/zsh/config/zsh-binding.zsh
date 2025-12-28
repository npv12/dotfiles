#!/usr/bin/env zsh

if [[ $(uname) == "Darwin" ]]; then
    # Mac keybindings
    zstyle ':z4h:bindkey' keyboard  'mac'
elif [[ $(uname) == "Linux" ]]; then
    # PC keybindings
    zstyle ':z4h:bindkey' keyboard  'pc'
else
    # WSL Specific
    # Start tmux automatically
    zstyle ':z4h:' start-tmux command tmux -u new -A -D -t z4h
    zstyle ':z4h:bindkey' keyboard  'pc'
fi
