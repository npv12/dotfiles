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

    if (( use_fzf )); then
        printenv | sort | awk -v C_NAME="${BOLD}${BLUE}" \
                                   -v C_EQ="${DIM}" \
                                   -v C_VAL="${GREEN}" \
                                   -v C_RST="${RESET}" \
                                   -v TERM_WIDTH="$cols" \
        '
        {
            idx = index($0, "=")
            if (idx == 0) next

            name = substr($0, 1, idx - 1)
            val  = substr($0, idx + 1)

            name_width = 25
            prefix_total = 2 + name_width + 4
            available_width = TERM_WIDTH - prefix_total - 2

            printf "  %s%-25s%s %s::%s %s", C_NAME, name, C_RST, C_EQ, C_RST, C_VAL

            if (length(val) <= available_width) {
                print val C_RST
            } else {
                print substr(val, 1, available_width) C_RST
                remaining = substr(val, available_width + 1)
                while (length(remaining) > 0) {
                    printf "  %25s    %s%s%s\n", "", C_VAL, substr(remaining, 1, available_width), C_RST
                    remaining = substr(remaining, available_width + 1)
                }
            }
        }' | fzf --ansi --layout=reverse --height=100% \
            --prompt="Search env > " \
            --preview="echo {}" \
            --preview-window=hidden \
            --bind="enter:abort" \
            --header="${YELLOW}Environment Variables${RESET}"
    else
        printenv | sort | awk -v C_NAME="${BOLD}${BLUE}" \
                                   -v C_EQ="${DIM}" \
                                   -v C_VAL="${GREEN}" \
                                   -v C_RST="${RESET}" \
                                   -v TERM_WIDTH="$cols" \
        '
        {
            idx = index($0, "=")
            if (idx == 0) next

            name = substr($0, 1, idx - 1)
            val  = substr($0, idx + 1)

            name_width = 25
            prefix_total = 2 + name_width + 4
            available_width = TERM_WIDTH - prefix_total - 2

            printf "  %s%-25s%s %s::%s %s", C_NAME, name, C_RST, C_EQ, C_RST, C_VAL

            if (length(val) <= available_width) {
                print val C_RST
            } else {
                print substr(val, 1, available_width) C_RST
                remaining = substr(val, available_width + 1)
                while (length(remaining) > 0) {
                    printf "  %25s    %s%s%s\n", "", C_VAL, substr(remaining, 1, available_width), C_RST
                    remaining = substr(remaining, available_width + 1)
                }
            }
        }' | less -RFX
    fi
}

# ------------------------------------------------------------------------------
# Wrap env command for fuzzy search
# ------------------------------------------------------------------------------
function env() {
    if [[ $# -gt 0 ]]; then
        command env "$@"
    else
        SearchEnv
    fi
}
