#!/usr/bin/env zsh

if [[ $(uname) == "Darwin" || $(uname) == "Linux" ]]; then
    # Mac keybindings
else
    # WSL Specific
    # Start tmux automatically
    zstyle ':z4h:' start-tmux command tmux -u new -A -D -t z4h
fi
