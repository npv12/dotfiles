# ------------------------------------------------------------------------------
# SearchEnv: Fuzzy search environment variables
# ------------------------------------------------------------------------------
function SearchEnv() {
    local BLUE=$'\e[34m'
    local GREEN=$'\e[32m'
    local YELLOW=$'\e[33m'
    local DIM=$'\e[2m'
    local RESET=$'\e[0m'
    local BOLD=$'\e[1m'

    local cols=$(tput cols)
    local use_fzf=0

    if (( $+commands[fzf] )); then
        use_fzf=1
    fi

    local print_env() {
        local name_width=25
        local prefix_total=2 + name_width + 4
        local available_width=$((cols - prefix_total - 2))

        while IFS='=' read -r name value; do
            printf "  %s%-25s%s %s::%s %s" "${BOLD}${BLUE}" "$name" "$RESET" "$DIM" "$RESET" "${GREEN}"

            if [[ ${#value} -le $available_width ]]; then
                print -r -- "$value${RESET}"
            else
                print -r -- "${value:0:$available_width}${RESET}"
                local remaining="${value:$available_width}"
                while [[ ${#remaining} -gt 0 ]]; do
                    printf "  %25s    %s%s%s\n" "" "${GREEN}" "${remaining:0:$available_width}" "$RESET"
                    remaining="${remaining:$available_width}"
                done
            fi
        done
    }

    if (( use_fzf )); then
        printenv | sort | print_env | fzf --ansi --layout=reverse --height=100% \
            --prompt="Search env > " \
            --preview="echo {}" \
            --preview-window=hidden \
            --bind="enter:abort" \
            --header="${YELLOW}Environment Variables${RESET}"
    else
        printenv | sort | print_env | less -RFX
    fi
}

# ------------------------------------------------------------------------------
# Wrap env command for fuzzy search
# ------------------------------------------------------------------------------
function env() {
    if [[ $# -gt 0 ]]; then
        command env "$@"
    else
        command env | SearchEnv
    fi
}
