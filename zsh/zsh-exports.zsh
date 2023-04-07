#!/bin/sh

# Contains custom exports
# FZF
export FZF_DEFAULT_OPTS=" \
--layout=reverse
--info=inline
--multi
--border top
--height 65%
--color bg+:#1e1e2e,bg:#1e1e2e,spinner:#f5e0dc,hl:#af5fff \
--color fg:#cdd6f4,header:#f38ba8,info:#cba6f7,pointer:#f5e0dc \
--color marker:#f5e0dc,fg+:#cdd6f4,prompt:#cba6f7,hl+:#f38ba8 \
--margin '2%,1%,2%,1%'"

# GPG
export GPG_TTY=$TTY

# GO
export PATH="$PATH:/Coding/bins/go/bin"
export GOPATH="/Coding/bins/go"

# Fuzzy search
export PATH="${Z4H}/bigH/git-fuzzy/bin:$PATH"

# Micro
export "MICRO_TRUECOLOR=1"

# Yarn
export PATH="~/.yarn/bin:$PATH"
