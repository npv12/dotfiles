#!/bin/sh

# Stores varies aliases we use
# Android
alias dump="/Study/Coding/Roms/dump"
alias studio="/Study/Coding/Software/android-studio/bin/studio.sh"

# DNF
if command -v dnf &> /dev/null; then
    alias pkg-clean="sudo dnf clean all"    # Cleans the cache.
    alias pkg-install="sudo dnf install"      # Installs package(s).
    alias pkg-list="dnf list installed"    # Lists installed packages.
    alias pkg-info="dnf info"              # Displays package information.
    alias pkg-remove="sudo dnf remove"       # Removes package(s).
    alias pkg-search="dnf search"            # Searches for a package.
    alias os-update="sudo dnf update"       # Updates packages.
    alias os-upgrade="sudo dnf upgrade"      # Upgrades packages.
fi

# Paru for arch
if command -v paru &> /dev/null; then
    alias pkg-clean="paru --clean"    # Cleans the pkgs.
    alias pkg-install="paru -S"      # Installs package(s).
    alias pkg-list="paru -Q"    # Lists installed packages.
    alias pkg-remove="paru -Rns"       # Removes package(s).
    alias pkg-search="paru -Ss"            # Searches for a package.
    alias os-update="paru"       # Updates packages.
    alias os-upgrade="paru && pkg-clean"      # Upgrades packages.
fi

# Exa
if command -v exa &> /dev/null; then
    alias ls="exa --group-directories-first --icons"
    alias ll="ls -lh --git"
    alias la="ll -a"
    alias tree="ll --tree --level=2"
    alias lh="la -h"
fi

# Flutter
alias fl="flutter"
alias flattach="flutter attach"
alias flb="flutter build"
alias flchnl="flutter channel"
alias flc="flutter clean"
alias fldvcs="flutter devices"
alias fldoc="flutter doctor"
alias flpub="flutter pub"
alias flget="flutter pub get"
alias flr="flutter run"
alias flrd="flutter run --debug"
alias flrp="flutter run --profile"
alias flrr="flutter run --release"
alias flupgrd="flutter upgrade"

# GIT
alias git="noglob git"
alias g="git"
alias ga="g add"
alias gav="ga --verbose"
alias gap="g apply"
alias gbr="g branch"
alias gbrnm="gbr --no-merged"
alias gbl="g blame -b -w"
alias gbs="g bisect"
alias gcm="g commit -s -S -v"
alias gcm!="gcm --amend"
alias gcmn="gcm --no-edit"
alias gcmn!="gcm --no-edit --amend"
alias gco="g checkout"
alias gcor="gco --recurse-submodules"
alias gcp="g cherry-pick -s"
alias gcpa="g cherry-pick --abort"
alias gcpc="g cherry-pick --continue"
alias gcps="g cherry-pick --skip"
alias gcpss="gcm -s -S"
alias gd="g diff"
alias gf="g fetch"
alias gp="g push"
alias gpl="g pull"
alias gfo="gf origin"
alias gm="g merge"
alias grem="g remote"
alias grb="g rebase"
alias gr="g reset"
alias grh="g reset HEAD"
alias grh!="g reset --hard HEAD"
alias gst="g status"
alias gl="g log"
alias gsl="git shortlog"
alias gcount="g -sn"
alias gstats="gl --graph --pretty='%Cred%h%Creset -%C(auto)%d%Creset %s %Cgreen(%ar) %C(bold blue)by %an%Creset' --all"
alias glast="gl -1 HEAD"

# Grep
alias pygrep="grep -nr --include='*.py'"

# GPG
alias gpg-check="gpg2 --keyserver-options auto-key-retrieve --verify" # verify signature for isos
alias gpg-retrieve="gpg2 --keyserver-options auto-key-retrieve --receive-keys" # receive the key of a developer

# Misc
alias cp="cp -i"
alias mv="mv -i"
alias rm="rm -i"
alias open="xdg-open"
alias btrdu="btrfs filesystem du -s"

# Python
alias pyenv="source venv/bin/activate"

# React native
alias rn="react-native"
alias rns="react-native start"
alias rnlink="react-native link"
alias rnland="react-native log-android"
alias rnlios="react-native log-ios"
alias rnand="react-native run-android"
alias rnios="react-native run-ios"

# systemd
alias list_systemctl="systemctl list-unit-files --state=enabled"

# Zsh core
alias zshconfig="open ${ZSH_DIR}/controller.zsh"
