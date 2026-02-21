#!/bin/zsh

# Initialize profiling if ZSH_PROFILE is set
_benchmark_init() {
    if [[ "${ZSH_PROFILE:-}" == "1" ]]; then
        zmodload zsh/zprof 2>/dev/null
        typeset -g ZSH_PROFILE_START=$EPOCHREALTIME
    fi
}

# Display profiling results
_benchmark_report() {
    if [[ "${ZSH_PROFILE:-}" != "1" ]] || [[ -z "$ZSH_PROFILE_START" ]]; then
        return
    fi

    local end_time=$EPOCHREALTIME
    local duration=$(( (end_time - ZSH_PROFILE_START) * 1000 ))

    local BLUE=$'\e[38;5;75m'
    local GREEN=$'\e[38;5;42m'
    local RED=$'\e[38;5;196m'
    local ORANGE=$'\e[38;5;208m'
    local YELLOW=$'\e[38;5;227m'
    local CYAN=$'\e[38;5;51m'
    local MAGENTA=$'\e[38;5;141m'
    local PURPLE=$'\e[38;5;135m'
    local GRAY=$'\e[38;5;243m'
    local DIM=$'\e[2m'
    local BOLD=$'\e[1m'
    local RESET=$'\e[0m'

    local rating="⚡ Lightning"
    local rating_color="$GREEN"
    local rating_icon="●"
    if (( duration > 200 )); then
        rating="🐌 Sluggish"; rating_color="$RED"; rating_icon="●"
    elif (( duration > 100 )); then
        rating="⚠ Slow"; rating_color="$ORANGE"; rating_icon="●"
    elif (( duration > 40 )); then
        rating="✓ Normal"; rating_color="$CYAN"; rating_icon="●"
    fi

    printf "\n"
    printf "${PURPLE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
    printf "${PURPLE}${BOLD}  ⚙  ZSH Startup Profile${RESET}\n"
    printf "${PURPLE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"

    printf "  ${rating_color}${BOLD}${rating_icon} ${rating}${RESET}  ${GRAY}│${RESET}  ${BOLD}%.2fms${RESET}\n\n" "$duration"

    printf "  ${GRAY}${BOLD}TOP FUNCTIONS${RESET}${GRAY} (by execution time)${RESET}\n\n"

    zprof | awk -v C_NAME="${BLUE}" \
                -v C_TIME="${CYAN}" \
                -v C_PERCENT="${GRAY}" \
                -v C_BAR_FAST="${GREEN}" \
                -v C_BAR_MED="${YELLOW}" \
                -v C_BAR_SLOW="${ORANGE}" \
                -v C_BAR_CRIT="${RED}" \
                -v C_RESET="${RESET}" \
                -v C_DIM="${DIM}" \
    '
    BEGIN { max_width = 40 }
    {
        if ($1 !~ /^[0-9]+\)$/) next
        fn_name = $NF
        if (seen[fn_name]++) next
        if (count++ >= 8) exit

        calls = $2
        time_ms = $3 + 0
        percent = $5 + 0

        if (length(fn_name) > 32) {
            fn_name = substr(fn_name, 1, 30) "…"
        }

        bar_len = int((percent / 100) * max_width)
        if (bar_len < 1 && percent > 0) bar_len = 1

        bar_color = C_BAR_FAST
        if (time_ms > 20) bar_color = C_BAR_CRIT
        else if (time_ms > 10) bar_color = C_BAR_SLOW
        else if (time_ms > 5) bar_color = C_BAR_MED

        bar = ""
        for(i=0; i<bar_len; i++) bar = bar "▪"

        printf "  %s%-32s%s %s%7.2fms%s %s%5.1f%%%s\n",
            C_NAME, fn_name, C_RESET, C_TIME, time_ms, C_RESET, C_PERCENT, percent, C_RESET
        printf "  %s%s%s\n\n", bar_color, bar, C_RESET
    }'

    printf "  ${DIM}──────────────────────────────────────────────────────${RESET}\n"
    printf "  ${DIM}Tip: Run ${RESET}${CYAN}zprof${RESET}${DIM} for detailed analysis${RESET}\n"
    printf "  ${DIM}To disable profiling: ${RESET}${CYAN}unset ZSH_PROFILE${RESET}\n\n"
}
