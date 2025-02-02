#!/bin/sh

# beeping is annoying
unsetopt BEEP

zsh_add_file "zsh-aliases"
zsh_add_file "zsh-exports"
zsh_add_file "zsh-functions"
zsh_add_file "zsh-expand-dot-dir"

if command -v keychain &> /dev/null; then
    eval `keychain -q --eval /home/npv12/.ssh/id_git`
fi

# Zoxide rocks
if command -v zoxide &> /dev/null; then
    eval "$(zoxide init zsh)"
fi
