#!/usr/bin/env zsh

# beeping is annoying
unsetopt BEEP

# One deferred unit: fewer zle idle round-trips than separate zsh_defer_add per file.
function _zsh_deferred_controller() {
    zsh_add_file "zsh-aliases"
    zsh_add_file "zsh-exports"
    zsh_add_file "zsh-functions"
    zsh_add_file "zsh-completion"
    zsh_add_file "zsh-mise"
    source "$ZSH_DIR/modules/load.zsh"
    if command -v zoxide &>/dev/null; then
        eval "$(zoxide init zsh)"
    fi
}

zsh_defer_add _zsh_deferred_controller
