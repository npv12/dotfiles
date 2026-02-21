#!/bin/zsh

# Initialize profiling if ZSH_BENCHMARK is set
_benchmark_init() {
    if [[ "${ZSH_BENCHMARK:-}" == "1" ]]; then
        zmodload zsh/zprof 2>/dev/null
        typeset -g ZSH_BENCHMARK_START=$EPOCHREALTIME
        typeset -g ZSH_BENCHMARK_READY_MS=""
        typeset -g ZSH_BENCHMARK_DEFER_MS="0"
    fi
}

_benchmark_set_ready_time() {
    [[ "${ZSH_BENCHMARK:-}" == "1" ]] || return 0
    typeset -g ZSH_BENCHMARK_READY_MS="$1"
}

_benchmark_add_defer_time() {
    [[ "${ZSH_BENCHMARK:-}" == "1" ]] || return 0
    local delta_ms="${1:-0}"
    typeset -g ZSH_BENCHMARK_DEFER_MS=$(( ${ZSH_BENCHMARK_DEFER_MS:-0} + delta_ms ))
}

# Display profiling results
_benchmark_report() {
    if [[ "${ZSH_BENCHMARK:-}" != "1" ]] || [[ -z "$ZSH_BENCHMARK_START" ]]; then
        return
    fi

    local end_time=$EPOCHREALTIME
    local duration=$(( (end_time - ZSH_BENCHMARK_START) * 1000 ))
    local ready_ms="${ZSH_BENCHMARK_READY_MS:-$duration}"
    local defer_ms="${ZSH_BENCHMARK_DEFER_MS:-0}"
    local final_ms=$(( ready_ms + defer_ms ))

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

    local ready_rating="⚡ Lightning"
    local ready_color="$GREEN"
    if (( ready_ms > 120 )); then
        ready_rating="🐌 Sluggish"; ready_color="$RED"
    elif (( ready_ms > 60 )); then
        ready_rating="⚠ Slow"; ready_color="$ORANGE"
    elif (( ready_ms > 30 )); then
        ready_rating="✓ Normal"; ready_color="$CYAN"
    fi

    local defer_rating="⚡ Lightning"
    local defer_color="$GREEN"
    if (( defer_ms > 160 )); then
        defer_rating="🐌 Sluggish"; defer_color="$RED"
    elif (( defer_ms > 80 )); then
        defer_rating="⚠ Slow"; defer_color="$ORANGE"
    elif (( defer_ms > 30 )); then
        defer_rating="✓ Normal"; defer_color="$CYAN"
    fi

    local final_rating="⚡ Lightning"
    local final_color="$GREEN"
    local final_icon="●"
    if (( final_ms > 200 )); then
        final_rating="🐌 Sluggish"; final_color="$RED"
    elif (( final_ms > 100 )); then
        final_rating="⚠ Slow"; final_color="$ORANGE"
    elif (( final_ms > 40 )); then
        final_rating="✓ Normal"; final_color="$CYAN"
    fi

    printf "\n"
    printf "${PURPLE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
    printf "${PURPLE}${BOLD}  ⚙  ZSH Startup Profile${RESET}\n"
    printf "${PURPLE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"

    printf "  ${ready_color}${BOLD}${final_icon} ${ready_rating}${RESET}  ${GRAY}│${RESET}  ${BOLD}%.2fms${RESET}\n" "$ready_ms"
    printf "  ${DIM}ready:${RESET} ${ready_color}%s${RESET} ${CYAN}%.2fms${RESET}  ${DIM}defer:${RESET} ${defer_color}%s${RESET} ${CYAN}%.2fms${RESET}  ${DIM}final:${RESET} ${final_color}%s${RESET} ${CYAN}%.2fms${RESET}\n\n" "$ready_rating" "$ready_ms" "$defer_rating" "$defer_ms" "$final_rating" "$final_ms"

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
    printf "  ${DIM}To disable profiling: ${RESET}${CYAN}unset ZSH_BENCHMARK${RESET}\n\n"
}
