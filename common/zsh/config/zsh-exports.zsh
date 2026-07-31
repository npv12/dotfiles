#!/usr/bin/env zsh

# Contains custom exports
# FZF
export FZF_DEFAULT_OPTS="--layout=reverse --info=inline \
--no-border \
--list-border=rounded \
--list-label-pos=2 \
--highlight-line \
--pointer=' ' \
--marker='󰄲 ' \
--color=bg:#1e1e2e,bg+:#45475a \
--color=fg:#cdd6f4,fg+:#cdd6f4 \
--color=spinner:#89dceb,hl:#74c7ec,hl+:#89dceb \
--color=header:#74c7ec,info:#74c7ec,prompt:#74c7ec \
--color=pointer:#89b4fa,marker:#94e2d5 \
--color=list-border:#74c7ec,list-label:#74c7ec \
--margin=2%,1%,2%,1% \
--padding=0,1"

# GPG
export GPG_TTY=$TTY

# Fuzzy search
export PATH="${Z4H}/bigH/git-fuzzy/bin:$PATH"

# History
export HISTORY_IGNORE_DUPS=1
export HISTORY_IGNORE="(pass * | mise set *)"

# Micro
export "MICRO_TRUECOLOR=1"

if command -v opencode &> /dev/null; then
	export OPENCODE_EXPERIMENTAL_EXA=true
	export OPENCODE_EXPERIMENTAL_PLAN_MODE=true
fi

# Python
export AUTOSWITCH_DEFAULT_PYTHON=python3

# Vivid
if command -v vivid &> /dev/null; then
    export LS_COLORS="$(vivid generate catppuccin-mocha)"
fi
