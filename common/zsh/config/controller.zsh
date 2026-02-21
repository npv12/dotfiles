#!/bin/sh

# beeping is annoying
unsetopt BEEP

zsh_defer_add 'zsh_add_file "zsh-aliases"'
zsh_defer_add 'zsh_add_file "zsh-exports"'
zsh_defer_add 'zsh_add_file "zsh-autocomplete.zsh"'
zsh_defer_add 'zsh_add_file "zsh-functions"'
zsh_defer_add 'zsh_add_file "zsh-mise"'
zsh_defer_add 'zsh_add_file "zsh-expand-dot-dir"'
zsh_defer_add 'zsh_add_file "zsh-completion"'

# Load modules
zsh_defer_add 'source "$ZSH_DIR/modules/load.zsh"'

zsh_defer_add 'if command -v keychain &>/dev/null; then eval `keychain -q --eval /home/npv12/.ssh/id_git`; fi'

# Zoxide rocks
zsh_defer_add 'if command -v zoxide &>/dev/null; then eval "$(zoxide init zsh)"; fi'
