#!/bin/sh

# Stores varies aliases we use
# Android
alias dump=/Study/Coding/Roms/dump
alias studio=/Study/Coding/Software/android-studio/bin/studio.sh

# DNF
alias dnfc="sudo dnf clean all"    # Cleans the cache.
alias dnfh="dnf history"           # Displays history.
alias dnfi="sudo dnf install"      # Installs package(s).
alias dnfl="dnf list"              # Lists packages.
alias dnfL="dnf list installed"    # Lists installed packages.
alias dnfq="dnf info"              # Displays package information.
alias dnfr="sudo dnf remove"       # Removes package(s).
alias dnfs="dnf search"            # Searches for a package.
alias dnfu="sudo dnf update"       # Updates packages.
alias dnfU="sudo dnf upgrade"      # Upgrades packages.

# Exa
alias ls="exa --group-directories-first --icons"
alias ll="ls -lh --git"
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

# Grep
alias pygrep="grep -nr --include='*.py'"

# GPG
alias gpg-check="gpg2 --keyserver-options auto-key-retrieve --verify" # verify signature for isos
alias gpg-retrieve="gpg2 --keyserver-options auto-key-retrieve --receive-keys" # receive the key of a developer

# Misc
alias cp="cp -i"
alias mv="mv -i"
alias rm="rm -i"
alias open='xdg-open'
alias btrdu='btrfs filesystem du -s'

# Python
alias pyenv='source venv/bin/activate'

# React native
alias rn='react-native'
alias rns='react-native start'
alias rnlink='react-native link'
alias rnland='react-native log-android'
alias rnlios='react-native log-ios'
alias rnand='react-native run-android'
alias rnios='react-native run-ios'

# systemd
alias list_systemctl="systemctl list-unit-files --state=enabled"

# Zsh core
alias zsh-clean-plugins="rm -rf ${ZDOTDIR}/plugins/*"
alias zsh-update-plugins="find "$ZDOTDIR/plugins" -type d -exec test -e '{}/.git' ';' -print0 | xargs -I {} -0 git -C {} pull -q"
alias zshconfig="open ${ZDOTDIR}/controller.zsh"