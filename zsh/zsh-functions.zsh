#!/bin/sh

function extract () {
    if [ -f $1 ] ; then
        case $1 in
            *.tar.bz2)   tar xjf $1   ;;
            *.tar.gz)    tar xzf $1   ;;
            *.bz2)       bunzip2 $1   ;;
            *.rar)       unrar x $1     ;;
            *.gz)        gunzip $1    ;;
            *.tar)       tar xvvf $1    ;;
            *.tbz2)      tar xjf $1   ;;
            *.tgz)       tar xzf $1   ;;
            *.zip)       unzip $1     ;;
            *.Z)         uncompress $1;;
            *.7z)        7z x $1      ;;
            *)           echo "'$1' cannot be extracted via extract()" ;;
        esac
    else
        echo "'$1' is not a valid file"
    fi
}

# Git related
function del-multiple-branches() {
    git branch | grep "$1" | xargs git branch -D
}

function del-multiple-remotes() {
    git remote -v | grep "$1" | xargs git remote remove
}

# Pacman
if command -v pacman &> /dev/null; then
    function pac-list() {
        pacman -Qqe | \
        xargs -I '{}' \
        expac "${bold_color}% 20n ${fg_no_bold[white]}%d${reset_color}" '{}'
    }
    
    function pac-disowned() {
        local tmp db fs
        tmp=${TMPDIR-/tmp}/pacman-disowned-$UID-$$
        db=$tmp/db
        fs=$tmp/fs
        
        mkdir "$tmp"
        trap 'rm -rf "$tmp"' EXIT
        
        pacman -Qlq | sort -u > "$db"
        
        find /bin /etc /lib /sbin /usr ! -name lost+found ! -path '/usr/share/secureboot/*' ! -path '/usr/local/bin/*' ! -path '/etc/doas.conf' \
        \( -type d -printf '%p/\n' -o -print \) | sort > "$fs"
        
        comm -23 "$fs" "$db"
    }
    
    alias pacmanallkeys='sudo pacman-key --refresh-keys'
    
    function pacman-signkeys() {
        local key
        for key in $@; do
            sudo pacman-key --recv-keys $key
            sudo pacman-key --lsign-key $key
            printf 'trust\n3\n' | sudo gpg --homedir /etc/pacman.d/gnupg \
            --no-permission-warning --command-fd 0 --edit-key $key
        done
    }
    
    if (( $+commands[xdg-open] )); then
        function pac-web() {
            if [[ $# = 0 || "$1" =~ '--help|-h' ]]; then
                local underline_color="\e[${color[underline]}m"
                echo "$0 - open the website of an ArchLinux package"
                echo
                echo "Usage:"
                echo "    $bold_color$0$reset_color ${underline_color}target${reset_color}"
                return 1
            fi
            
            local pkg="$1"
            local infos="$(LANG=C pacman -Si "$pkg")"
            if [[ -z "$infos" ]]; then
                return
            fi
            local repo="$(grep -m 1 '^Repo' <<< "$infos" | grep -oP '[^ ]+$')"
            local arch="$(grep -m 1 '^Arch' <<< "$infos" | grep -oP '[^ ]+$')"
            xdg-open "https://www.archlinux.org/packages/$repo/$arch/$pkg/" &>/dev/null
        }
    fi
fi

function load-nvm() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
}

function load-ros() {
    export ROS_DOMAIN_ID=42
    export ROS_VERSION=1
    export ROS_PYTHON_VERSION=3
    export ROS_DISTRO=noetic
    z4h source /opt/ros/noetic/setup.zsh
}

function load-rust() {
    z4h source "$HOME/.cargo/env"
}

function ros-update() {
    python ~/dotfiles/scripts/update-missing-ros.py
}

function grub-regen() {
    sudo grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=endeavouros && \
    sudo grub-mkconfig -o /boot/grub/grub.cfg
    sudo efibootmgr -c -d /dev/nvme0n1 -p 5 -l \\EFI\\endeavouros\\shimx64.efi -L "endeavouros (secure)"
}

function load-sdkman() {
    export SDKMAN_DIR="$HOME/.sdkman"
    [ -s "$SDKMAN_DIR/bin/sdkman-init.sh" ] && source "$SDKMAN_DIR/bin/sdkman-init.sh"
}


# Sideload android
function rom-sideload() {
    adb reboot sideload-auto-reboot && adb wait-for-device-sideload && adb sideload $1 && rm $1
}

function rom-flashall() {
    #adb reboot fastboot
    for filename in ./*.img; do
        partition=$(basename $filename .img)
        fastboot flash --slot=all $partition $filename
    done
    echo "Done flashing now format and reboot"
}

function rom-extract-and-flash() {
    dump $1
    cd extracted_* && rom-flashall
}

# Wallpapers
function sync-wallpapers() {
  rcp /Personal/Wallpapers/Desktop onedrive:work/Backup/Wallpapers/Desktop --transfers 8
  rcp /Personal/Wallpapers/Phone onedrive:work/Backup/Wallpapers/Phone --transfers 8
}

function sync-pics() {
    PWD=$(pwd)
    cd /Personal/Camera && rcp . "onedrive:work/Backup/camera"
    cd "$PWD"
}

# YT Download
function yt-download() {
    yt-dlp -ciwx --audio-format mp3 --audio-quality 0 $1
}

timezsh() {
    for i in $(seq 1 10); do time zsh -i -c exit; done
}
