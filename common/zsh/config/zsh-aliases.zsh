#!/bin/sh

# Stores varies aliases we use

# Code
alias code="cursor"
alias zed="zed-preview"
alias opencode="CONTEXT7_API_KEY=\$(pass tokens/context7) SYNTHETIC_API_KEY=\$(pass tokens/synthetic/simbian) opencode"

# Eza
if command -v eza &> /dev/null; then
    alias ls="eza --group-directories-first --icons=always"
fi

alias ll="ls -lh"
alias la="ll -a"
alias tree="ls --tree --level=2 --icons=never"
alias lh="la -h"

# Grep
alias pygrep="grep -nr --include='*.py'"

# Alias for some common application that ubuntu fucks up
if command -v apt-get &> /dev/null; then
    alias fd=fdfind
    alias bat=batcat
fi

# GPG
alias gpg-check="gpg2 --keyserver-options auto-key-retrieve --verify" # verify signature for isos
alias gpg-retrieve="gpg2 --keyserver-options auto-key-retrieve --receive-keys" # receive the key of a developer

# Misc
alias cp="cp -i"
alias mv="mv -i"
alias rm="rm -i"

# Needed for zsh4human
alias clear=z4h-clear-screen-soft-bottom

# If macOS, do not alias it
if [[ "$OSTYPE" != "darwin"* ]]; then
    alias open="xdg-open"
fi

# if btrfs is not installed, no alias
if command -v btrfs &> /dev/null; then
    alias btrdu="btrfs filesystem du -s"
fi

# Python
alias python="python3"

# Rclone
alias rcp="rclone copy --progress"

# systemd
alias list_systemctl="systemctl list-unit-files --state=enabled"

# Zsh core
alias zshconfig="zed ${ZSH_DIR}/"

# Pbcopy replacement
if ! command -v pbcopy &> /dev/null; then
    alias pbcopy="xclip -selection clipboard"
    alias pbpaste='xclip -selection clipboard -o'
fi

if command -v podman &> /dev/null; then
    alias docker=podman
fi
