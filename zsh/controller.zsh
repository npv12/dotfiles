#!/bin/sh

# some useful options (man zshoptions)
setopt autocd extendedglob nomatch menucomplete
setopt interactive_comments
stty stop undef		# Disable ctrl-s to freeze terminal.
zle_highlight=('paste:none')

# beeping is annoying
unsetopt BEEP

# completions
autoload -Uz compinit
zstyle ':completion:*' menu select
zmodload zsh/complist
compinit

autoload -U up-line-or-beginning-search
autoload -U down-line-or-beginning-search
zle -N up-line-or-beginning-search
zle -N down-line-or-beginning-search

# Colors
autoload -Uz colors && colors

# Useful Functions
source "$ZDOTDIR/functions.zsh"

zsh_add_file "zsh-aliases"
zsh_add_file "zsh-exports"
zsh_add_file "zsh-functions"
zsh_add_file "zsh-prompt"
zsh_add_file "zsh-expand-dot-dir" # Thanks prezto

zsh_add_plugin "Aloxaf/fzf-tab"
zsh_add_plugin "bigH/git-fuzzy"
zsh_add_plugin "hlissner/zsh-autopair"
zsh_add_completion "zsh-users/zsh-completions" false
zsh_add_plugin "zsh-users/zsh-autosuggestions"
zsh_add_plugin "zsh-users/zsh-syntax-highlighting"

bindkey '^[[A' up-line-or-beginning-search
bindkey '^[[B' down-line-or-beginning-search

# FZF. Use installer
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
