#!/bin/sh

# Stores varies aliases we use
# Android
alias dump="/Coding/Software/dump"
alias studio="/Coding/Software/android-studio/bin/studio.sh"

# Code
alias code="code-insiders"

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

# If yay exists, treat it as paru
if command -v yay &> /dev/null; then
    alias paru=yay
    alias install-apps="yay -Slq | fzf --multi --preview 'yay -Si {1}' | xargs -ro yay -S"
    alias view-apps="yay -Qq | fzf --preview 'yay -Qil {}' --layout=reverse --bind 'enter:execute(yay -Qil {} | less)'"
fi

# Paru for arch
if command -v paru &> /dev/null; then
    alias pkg-clean="paru -Y --clean"    # Cleans the pkgs.
    alias pkg-install="paru -S"      # Installs package(s).
    alias pkg-list="paru -Q"    # Lists installed packages.
    alias pkg-remove="paru -Rns"       # Removes package(s).
    alias pkg-search="paru -Ss"            # Searches for a package.
    alias os-update="paru && flatpak update"       # Updates packages.
    alias os-upgrade="os-update && pkg-clean"      # Upgrades packages.
fi

# Exa
if command -v exa &> /dev/null; then
    alias ls="exa --group-directories-first --icons"
fi

alias ll="ls -lh"
alias la="ll -a"
alias tree="ll --tree --level=2"
alias lh="la -h"

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
alias ga="git add"
alias gav="git add --verbose"
alias gap="git apply"
alias gbr="git branch"
alias gbrnm="git branch --no-merged"
alias gbl="git blame -b -w"
alias gbs="git bisect"
alias gcm="git commit -s -S -v"
alias gcm!="git commit -s -S -v --amend"
alias gcmn="git commit -s -S -v --no-edit"
alias gcmn!="git commit -s -S -v --no-edit --amend"
alias gco="git checkout"
alias gcor="git checkout --recurse-submodules"
alias gcp="git cherry-pick -s -S"
alias gcpa="git cherry-pick --abort"
alias gcpc="git cherry-pick --continue"
alias gcps="git cherry-pick --skip"
alias gd="git diff"
alias gf="git fetch"
alias gp="git push"
alias gpl="git pull"
alias gfo="git fetch origin"
alias gm="git merge"
alias grem="git remote"
alias grb="git rebase"
alias gr="git reset"
alias grh="git reset HEAD"
alias grh!="git reset --hard HEAD"
alias gst="git status"
alias gl="git log"
alias gsl="git shortlog"
alias gcount="git -sn"
alias gstats="git log --graph --pretty='%Cred%h%Creset -%C(auto)%d%Creset %s %Cgreen(%ar) %C(bold blue)by %an%Creset' --all"
alias glast="git log -1 HEAD"

# Grep
alias pygrep="grep -nr --include='*.py'"

# Alias for some common application that ubuntu fucks up
alias fd=fdfind
alias bat=batcat

# GPG
alias gpg-check="gpg2 --keyserver-options auto-key-retrieve --verify" # verify signature for isos
alias gpg-retrieve="gpg2 --keyserver-options auto-key-retrieve --receive-keys" # receive the key of a developer

# Light novel
alias novel="~/dotfiles/lightnovel.sh/lightnovel.sh"

# Misc
alias cp="cp -i"
alias mv="mv -i"
alias rm="rm -i"
alias open="xdg-open"
alias btrdu="btrfs filesystem du -s"

# Python
alias pyenv="source venv/bin/activate"

# Rclone
alias rcp="rclone copy --progress"

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
