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
