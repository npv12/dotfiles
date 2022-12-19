#!/bin/sh

# Contains custom exports
# FZF
# export FZF_DEFAULT_OPTS=$FZF_DEFAULT_OPTS'
#  --color=fg:#d0d0d0,bg:#121212,hl:#5f87af
#  --color=fg+:#d0d0d0,bg+:#262626,hl+:#5fd7ff
#  --color=info:#afaf87,prompt:#d7005f,pointer:#af5fff
#  --color=marker:#87ff00,spinner:#af5fff,header:#87afaf'

 export FZF_DEFAULT_OPTS=" \
--color=bg+:#1e1e2e,bg:#1e1e2e,spinner:#f5e0dc,hl:#f38ba8 \
--color=fg:#cdd6f4,header:#f38ba8,info:#cba6f7,pointer:#f5e0dc \
--color=marker:#f5e0dc,fg+:#cdd6f4,prompt:#cba6f7,hl+:#f38ba8"
 
# Git fuzzy
export PATH="/home/npv12/.config/zsh/plugins/git-fuzzy/bin:$PATH"

# GO
export PATH="$PATH:~/go/bin/"
export GOPATH="/Study/go"

# Nim
export PATH=/home/npv12/.nimble/bin:$PATH

# ZSH History for auto completion
HISTFILE="$ZDOTDIR"/.zsh-history
HISTSIZE=1000000
SAVEHIST=1000000

# Zoxide rocks
eval "$(zoxide init zsh)"