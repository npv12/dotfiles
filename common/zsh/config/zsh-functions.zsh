#!/usr/bin/env zsh

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

function load-python() {
    # Pyenv manager
    if command -v pyenv &> /dev/null; then
        eval "$(pyenv init -)"
        eval "$(pyenv virtualenv-init -)"
    fi
}

function load-mise() {
    eval "$(mise activate zsh)"
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
    yt-dlp -ciwx --audio-format mp3 --audio-quality 0 -o "%(playlist_index&{} - |)s%(title)s - %(uploader)s - %(upload_date)s.%(ext)s" $1
}

# Just used for testing
function timezsh() {
    for i in $(seq 1 10); do time zsh -i -c exit; done
}

# Kubernetes
function kres(){
  kubectl set env $@ REFRESHED_AT=$(date +%Y%m%d%H%M%S)
}

kxl () {
    if [[ -z "$KUBECONFIG_LOCAL" ]]; then
        export KUBECONFIG_LOCAL=$(mktemp /tmp/kubeconfig-local-XXXXXX)
        kubectl config view --flatten --minify --raw > "$KUBECONFIG_LOCAL"
        export KUBECONFIG="$KUBECONFIG_LOCAL"
    fi
    kubectx "$@"
}

compdef kxl=kubectx


# Utility print functions (json / yaml)
function _build_kubectl_out_alias {
  setopt localoptions norcexpandparam

  # alias function
  eval "function $1 { $2 }"

  # completion function
  eval "function _$1 {
    words=(kubectl \"\${words[@]:1}\")
    _kubectl
  }"

  compdef _$1 $1
}

_build_kubectl_out_alias "kj"  'kubectl "$@" -o json | jq'
_build_kubectl_out_alias "kjx" 'kubectl "$@" -o json | fx'
_build_kubectl_out_alias "ky"  'kubectl "$@" -o yaml | yh'
unfunction _build_kubectl_out_alias

# Pass
function create-password() {
     local pass=$(openssl rand -base64 $1)
     echo $pass
     echo $pass | pbcopy
 }

# Python
# If mkvenv is not already defined
if ! command -v mkvenv &> /dev/null; then
    function mkvenv() {
        if [ -f "mise.toml" ]; then
            echo "mise.toml already exists"
            return 1
        fi
        cat <<EOF > mise.toml
[tools]
python = "3.13"
uv = "latest"

[env._.python.venv]
path=".venv"
create = true

[tasks.check]
description = "Validate environment consistency"
run = "uv pip check && uv pip freeze | diff - requirements.txt"

[tasks.update]
description = "Update dependencies while maintaining constraints"
run = [
    "uv pip compile requirements.in -o requirements.txt",
    "uv pip sync requirements.txt"
]

[tasks.install]
description = "Install requirements.txt packages"
run = "uv pip install -r requirements.txt"

[tasks.sync]
description = "Synchronize environment with requirements.txt"
run = "uv pip sync requirements.txt"

[tasks.install-uv]
run = "mise install uv@latest"

[settings]
python.uv_venv_auto = true
python.uv_venv_create_args = ["--seed"]
EOF
        echo "mise.toml created successfully"
    }
fi

function del-hist() {
    LC_ALL=C sed -i '' "/$1/d" "$HISTFILE"
}

function kill-tmux-sessions() {
    # Zsh instance created by ZSH
    local keep_session="zsh-0"
    # Get all tmux sessions except the one we want to keep
    local sessions=$(tmux list-sessions -F '#{session_name}' | grep -v "^$keep_session$")
    if [[ -z "$sessions" ]]; then
        echo "No tmux sessions to kill."
        return 0
    fi
    for session in $sessions; do
        tmux kill-session -t "$session"
    done
}

function jqp() {
    pbpaste | sed -E 's/([,{[:space:]]*)([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*:/\1"\2":/g' | jq $@
}
