if command -v dnf &> /dev/null; then
    alias pkg-clean="sudo dnf clean all"
    alias pkg-install="sudo dnf install"
    alias pkg-list="dnf list installed"
    alias pkg-info="dnf info"
    alias pkg-remove="sudo dnf remove"
    alias pkg-search="dnf search"
    alias os-update="sudo dnf update"
    alias os-upgrade="sudo dnf upgrade"
fi

# If yay exists, treat it as paru
if command -v yay &> /dev/null; then
    alias paru=yay
    alias install-apps="yay -Slq | fzf --multi --preview 'yay -Si {1}' | xargs -ro yay -S"
    alias view-apps="yay -Qq | fzf --preview 'yay -Qil {}' --layout=reverse --bind 'enter:execute(yay -Qil {} | less)'"
fi

if command -v paru &> /dev/null; then
    alias pkg-clean="paru -Y --clean"
    alias pkg-install="paru -S"
    alias pkg-list="paru -Q"
    alias pkg-remove="paru -Rns"
    alias pkg-search="paru -Ss"
    alias os-update="paru && flatpak update"
    alias os-upgrade="os-update && pkg-clean"
fi

if command -v zypper &> /dev/null; then
    alias pkg-clean="sudo zypper clean && sudo zypper -q pa --orphaned | awk '{ print $5 }' | grep -v Name | xargs sudo zypper rm"
    alias pkg-install="sudo zypper install"
    alias pkg-list="zypper list"
    alias pkg-remove="zypper remove"
    alias pkg-search="zypper search"
    alias os-update="sudo zypper dup"
    alias os-upgrade="os-update && pkg-clean"
fi

if command -v pacman &> /dev/null; then
    alias pacmanallkeys='sudo pacman-key --refresh-keys'
fi
