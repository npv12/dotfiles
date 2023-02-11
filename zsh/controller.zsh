#!/bin/sh

# beeping is annoying
unsetopt BEEP

zsh_add_file "zsh-aliases"
zsh_add_file "zsh-exports"
zsh_add_file "zsh-functions"
zsh_add_file "zsh-expand-dot-dir"
zsh_add_file "quriate"

# Zoxide rocks
if command -v zoxide &> /dev/null; then
    eval "$(zoxide init zsh)"
fi

if command -v vivid &> /dev/null; then
    export LS_COLORS="$(vivid generate catppuccin-mocha)"
fi
