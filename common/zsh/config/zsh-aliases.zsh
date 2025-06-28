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

# Zypper for arch
if command -v zypper &> /dev/null; then
    alias pkg-clean="sudo zypper clean && sudo zypper -q pa --orphaned | awk '{ print $5 }' | grep -v Name | xargs sudo zypper rm"    # Cleans the pkgs.
    alias pkg-install="sudo zypper install"      # Installs package(s).
    alias pkg-list="zypper list"    # Lists installed packages.
    alias pkg-remove="zypper remove"       # Removes package(s).
    alias pkg-search="zypper search"            # Searches for a package.
    alias os-update="sudo zypper dup"       # Updates packages.
    alias os-upgrade="os-update && pkg-clean"      # Upgrades packages.
fi

# Eza
if command -v eza &> /dev/null; then
    alias ls="eza --group-directories-first --icons=always"
fi

alias ll="ls -lh"
alias la="ll -a"
alias tree="ls --tree --level=2 --icons=never"
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
if command -v apt-get &> /dev/null; then
    alias fd=fdfind
    alias bat=batcat
fi

# GPG
alias gpg-check="gpg2 --keyserver-options auto-key-retrieve --verify" # verify signature for isos
alias gpg-retrieve="gpg2 --keyserver-options auto-key-retrieve --receive-keys" # receive the key of a developer

# Light novel
alias novel="~/dotfiles/lightnovel.sh/lightnovel.sh"

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

# Kubernetes
alias k-aliases="alias | rg 'kubectl'"
alias k=kubectl
alias kx="kubectx"
alias kca='_kca(){ kubectl "$@" --all-namespaces;  unset -f _kca; }; _kca'
alias kaf='kubectl apply -f'
alias keti='kubectl exec -t -i'
alias kcuc='kubectl config use-context'
alias kcsc='kubectl config set-context'
alias kcdc='kubectl config delete-context'
alias kccc='kubectl config current-context'
alias kcgc='kubectl config get-contexts'
alias kdel='kubectl delete'
alias kdelf='kubectl delete -f'
alias kgp='kubectl get pods'
alias kgpl='kgp -l'
alias kgpn='kgp -n'
alias kgpsl='kubectl get pods --show-labels'
alias kgpa='kubectl get pods --all-namespaces'
alias kgpw='kgp --watch'
alias kgpwide='kgp -o wide'
alias kep='kubectl edit pods'
alias kdp='kubectl describe pods'
alias kdelp='kubectl delete pods'
alias kgpall='kubectl get pods --all-namespaces -o wide'
alias kgs='kubectl get svc'
alias kgsa='kubectl get svc --all-namespaces'
alias kgsw='kgs --watch'
alias kgswide='kgs -o wide'
alias kes='kubectl edit svc'
alias kds='kubectl describe svc'
alias kdels='kubectl delete svc'
alias kgi='kubectl get ingress'
alias kgia='kubectl get ingress --all-namespaces'
alias kei='kubectl edit ingress'
alias kdi='kubectl describe ingress'
alias kdeli='kubectl delete ingress'
alias kgns='kubectl get namespaces'
alias kens='kubectl edit namespace'
alias kdns='kubectl describe namespace'
alias kdelns='kubectl delete namespace'
alias kcn='kubectl config set-context --current --namespace'
alias kgcm='kubectl get configmaps'
alias kgcma='kubectl get configmaps --all-namespaces'
alias kecm='kubectl edit configmap'
alias kdcm='kubectl describe configmap'
alias kdelcm='kubectl delete configmap'
alias kgsec='kubectl get secret'
alias kgseca='kubectl get secret --all-namespaces'
alias kdsec='kubectl describe secret'
alias kdelsec='kubectl delete secret'
alias kgd='kubectl get deployment'
alias kgda='kubectl get deployment --all-namespaces'
alias kgdw='kgd --watch'
alias kgdwide='kgd -o wide'
alias ked='kubectl edit deployment'
alias kdd='kubectl describe deployment'
alias kdeld='kubectl delete deployment'
alias ksd='kubectl scale deployment'
alias krsd='kubectl rollout status deployment'
alias kgrs='kubectl get replicaset'
alias kdrs='kubectl describe replicaset'
alias kers='kubectl edit replicaset'
alias krh='kubectl rollout history'
alias kru='kubectl rollout undo'
alias kgss='kubectl get statefulset'
alias kgssa='kubectl get statefulset --all-namespaces'
alias kgssw='kgss --watch'
alias kgsswide='kgss -o wide'
alias kess='kubectl edit statefulset'
alias kdss='kubectl describe statefulset'
alias kdelss='kubectl delete statefulset'
alias ksss='kubectl scale statefulset'
alias krsss='kubectl rollout status statefulset'
alias kpf="kubectl port-forward"
alias kga='kubectl get all'
alias kgaa='kubectl get all --all-namespaces'
alias kl='kubectl logs'
alias kl1h='kubectl logs --since 1h'
alias kl1m='kubectl logs --since 1m'
alias kl1s='kubectl logs --since 1s'
alias klf='kubectl logs -f'
alias klf1h='kubectl logs --since 1h -f'
alias klf1m='kubectl logs --since 1m -f'
alias klf1s='kubectl logs --since 1s -f'
alias kcp='kubectl cp'
alias kgno='kubectl get nodes'
alias kgnosl='kubectl get nodes --show-labels'
alias keno='kubectl edit node'
alias kdno='kubectl describe node'
alias kdelno='kubectl delete node'
alias kgpvc='kubectl get pvc'
alias kgpvca='kubectl get pvc --all-namespaces'
alias kgpvcw='kgpvc --watch'
alias kepvc='kubectl edit pvc'
alias kdpvc='kubectl describe pvc'
alias kdelpvc='kubectl delete pvc'
alias kdsa="kubectl describe sa"
alias kdelsa="kubectl delete sa"
alias kgds='kubectl get daemonset'
alias kgdsa='kubectl get daemonset --all-namespaces'
alias kgdsw='kgds --watch'
alias keds='kubectl edit daemonset'
alias kdds='kubectl describe daemonset'
alias kdelds='kubectl delete daemonset'
alias kgcj='kubectl get cronjob'
alias kecj='kubectl edit cronjob'
alias kdcj='kubectl describe cronjob'
alias kdelcj='kubectl delete cronjob'
alias kgj='kubectl get job'
alias kej='kubectl edit job'
alias kdj='kubectl describe job'
alias kdelj='kubectl delete job'

# Pbcopy replacement
alias pbcopy="xclip -selection clipboard"
alias pbpaste='xclip -selection clipboard -o'