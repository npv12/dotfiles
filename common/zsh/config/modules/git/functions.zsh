function del-multiple-branches() {
    git branch | grep "$1" | xargs git branch -D
}

function del-multiple-remotes() {
    git remote -v | grep "$1" | xargs git remote remove
}

function generate_commit() {
    emulate -L zsh

    if ! whence _ai_chat > /dev/null; then
        echo "Error: _ai_chat function not found. Load the ai module first."
        return 1
    fi

    local diff
    diff="$(git diff --cached)"

    if [[ -z "$diff" ]]; then
        echo "No changes to commit."
        return 0
    fi

    local diff_lines
    diff_lines=$(printf "%s" "$diff" | wc -l)
    if [ "$diff_lines" -gt 2000 ]; then
        echo "Diff too large; refusing to read."
        return 1
    fi

    local prompts_dir="$ZSH_MODULES_DIR/git/prompts"
    local system_prompt_file="$prompts_dir/generate-commit-system.txt"

    if [[ ! -f "$system_prompt_file" ]]; then
        echo "Error: system prompt file not found: $system_prompt_file"
        return 1
    fi

    local SYSTEM_PROMPT
    SYSTEM_PROMPT=$(cat "$system_prompt_file")

    local USER_PROMPT
    read -r -d '' USER_PROMPT <<EOF
Generate a commit message using the rules from the system prompt.

Staged diff:
---
${diff}
---

Instructions:
1) Infer the module from the diff paths and conceptual grouping.
2) Output ONLY valid JSON following the system rules.
3) The commit title must include the type and the inferred module (unless module is "-").
4) Body should include bullet points for secondary changes.
5) If an actual secret value is present inside the diff, mention this in the title so the user notices (ignore 'pass ...' and token path references).
EOF

    local ai_output
    ai_output="$(_ai_chat "$SYSTEM_PROMPT" "$USER_PROMPT")" || return $?

    if [ -z "$ai_output" ] || [ "$ai_output" = "null" ]; then
        echo "AI returned no commit message."
        return 1
    fi

    local title body

    title=$(printf "%s" "$ai_output" | jq -r '.title')
    body=$(printf "%s" "$ai_output" | jq -r '.body')

    if [ -z "$body" ]; then
        git commit -s -S -v -m "$title"
    else
        git commit -s -S -v -m "$title" -m "$body"
    fi
}

function gitstatus() {
    if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        print "\e[31m Not a git repository.\e[0m"
        return 1
    fi

    if (( ! $+commands[fzf] )) || (( $# > 0 )); then
        command git status "$@"
        return
    fi

    local RESET='\e[0m'
    local BLUE='\e[34m'
    local GREEN='\e[32m'
    local RED='\e[31m'
    local YELLOW='\e[33m'
    local MAGENTA='\e[35m'
    local CYAN='\e[36m'
    local DIM='\e[2m'
    local BOLD='\e[1m'
    local BRIGHT_GREEN='\e[92m'
    local BRIGHT_YELLOW='\e[93m'
    local BRIGHT_BLUE='\e[94m'
    local BRIGHT_RED='\e[91m'

    local ICON_BRANCH=$'\ue0a0'
    local ICON_REMOTE=$'\uf02b'
    local ICON_AHEAD=$'\uf062'
    local ICON_BEHIND=$'\uf063'
    local ICON_SYNC=$'\uf00c'
    local ICON_STAGED=$'\uf00c'
    local ICON_UNSTAGED=$'\uf040'
    local ICON_UNTRACKED=$'\uf128'
    local ICON_CONFLICT=$'\uf00d'
    local ICON_FILE_ADDED=$'\uf067'
    local ICON_FILE_MODIFIED=$'\uf044'
    local ICON_FILE_DELETED=$'\uf068'
    local ICON_FILE_RENAMED=$'\uf074'
    local ICON_FILE_COPIED=$'\uf0c5'
    local ICON_FILE_UNTRACKED=$'\uf128'
    local ICON_FILE_CONFLICT=$'\uf12a'

    local branch upstream
    branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null)
    [[ -z "$branch" ]] && branch=$(git rev-parse --short HEAD 2>/dev/null)
    upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null)

    local ahead=0
    local behind=0
    if [[ -n "$upstream" ]]; then
        local ahead_behind
        ahead_behind=$(git rev-list --left-right --count "HEAD...$upstream" 2>/dev/null)
        if [[ -n "$ahead_behind" ]]; then
            ahead=${ahead_behind%%[[:space:]]*}
            behind=${ahead_behind##*[[:space:]]}
        fi
    fi

    local porcelain
    porcelain=$(git status --porcelain=v1 2>/dev/null)

    local -a staged_lines
    local -a unstaged_lines
    local -a untracked_lines
    local -a conflict_lines
    local line x y xy

    while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        x=${line[1,1]}
        y=${line[2,2]}
        xy="$x$y"

        if [[ "$xy" == "??" ]]; then
            untracked_lines+=("$line")
            continue
        fi

        if [[ "$xy" == "AA" || "$xy" == "DD" || "$x" == "U" || "$y" == "U" ]]; then
            conflict_lines+=("$line")
        fi

        [[ "$x" != " " ]] && staged_lines+=("$line")
        [[ "$y" != " " ]] && unstaged_lines+=("$line")
    done <<< "$porcelain"

    local staged_count=${#staged_lines[@]}
    local unstaged_count=${#unstaged_lines[@]}
    local untracked_count=${#untracked_lines[@]}
    local conflict_count=${#conflict_lines[@]}
    local total=$(( staged_count + unstaged_count + untracked_count ))

    local box_width=54

    print ""
    print -f "${CYAN}${BOLD}╭──────────────────────────────────────────────────────╮${RESET}\n"

    # Calculate padding: box is 54 wide, borders are 2 chars, we want 2 spaces padding on each side
    # So content area is 54 - 2 - 4 = 48 characters
    local content_width=52
    local left_pad="  "
    local right_pad=""

    # Branch line
    local branch_content="${ICON_BRANCH}  ${branch}"
    local branch_padding=$((content_width - ${#branch_content}))
    printf -v right_pad '%*s' "$branch_padding" ''
    print -f "${CYAN}${BOLD}│${RESET}${left_pad}${CYAN}${ICON_BRANCH}${RESET}  ${BOLD}%s${RESET}%s${CYAN}${BOLD}│${RESET}\n" "$branch" "$right_pad"

    if [[ -n "$upstream" ]]; then
        local sync_status=""
        local sync_icon="$ICON_SYNC"
        local sync_color="$GREEN"

        if (( ahead > 0 && behind > 0 )); then
            sync_status="diverged"
            sync_icon="$ICON_CONFLICT"
            sync_color="$RED"
        elif (( ahead > 0 )); then
            sync_status="ahead $ahead"
            sync_icon="$ICON_AHEAD"
            sync_color="$YELLOW"
        elif (( behind > 0 )); then
            sync_status="behind $behind"
            sync_icon="$ICON_BEHIND"
            sync_color="$RED"
        else
            sync_status="in sync"
        fi

        local remote_content="${ICON_REMOTE}  ${upstream}  ${sync_icon} ${sync_status}"
        local remote_padding=$((content_width - ${#remote_content}))
        printf -v right_pad '%*s' "$remote_padding" ''
        print -f "${CYAN}${BOLD}│${RESET}${left_pad}${DIM}${ICON_REMOTE}${RESET}  ${DIM}%s${RESET}  ${sync_color}%s${RESET} %s%s${CYAN}${BOLD}│${RESET}\n" "$upstream" "$sync_icon" "$sync_status" "$right_pad"
    else
        local no_upstream_content="${ICON_REMOTE}  no upstream configured"
        local no_upstream_padding=$((content_width - ${#no_upstream_content}))
        printf -v right_pad '%*s' "$no_upstream_padding" ''
        print -f "${CYAN}${BOLD}│${RESET}${left_pad}${DIM}${ICON_REMOTE}${RESET}  ${DIM}no upstream configured${RESET}%s${CYAN}${BOLD}│${RESET}\n" "$right_pad"
    fi

    print -f "${CYAN}${BOLD}╰──────────────────────────────────────────────────────╯${RESET}\n"
    print ""

    local icon status_code path color section_icon

    if (( conflict_count > 0 )); then
        print -f "  ${BRIGHT_RED}${BOLD}${ICON_CONFLICT}${RESET} ${BOLD}CONFLICTS${RESET} ${DIM}(%d)${RESET}\n" "$conflict_count"
        print -f "  ${DIM}──────────────────────────────────────────────────────${RESET}\n"
        for line in "${conflict_lines[@]}"; do
            path=${line[4,-1]}
            print -f "    ${BRIGHT_RED}${ICON_FILE_CONFLICT}${RESET}  %s\n" "$path"
        done
        print ""
    fi

    if (( staged_count > 0 )); then
        print -f "  ${BRIGHT_GREEN}${BOLD}${ICON_STAGED}${RESET} ${BOLD}STAGED${RESET} ${DIM}(%d)${RESET}\n" "$staged_count"
        print -f "  ${DIM}──────────────────────────────────────────────────────${RESET}\n"
        for line in "${staged_lines[@]}"; do
            status_code=${line[1,1]}
            path=${line[4,-1]}
            case "$status_code" in
                A) icon="$ICON_FILE_ADDED"; color="$BRIGHT_GREEN" ;;
                M) icon="$ICON_FILE_MODIFIED"; color="$BRIGHT_GREEN" ;;
                D) icon="$ICON_FILE_DELETED"; color="$BRIGHT_RED" ;;
                R) icon="$ICON_FILE_RENAMED"; color="$MAGENTA" ;;
                C) icon="$ICON_FILE_COPIED"; color="$MAGENTA" ;;
                *) icon="$ICON_FILE_MODIFIED"; color="$BRIGHT_GREEN" ;;
            esac
            print -f "    ${color}%s${RESET}  %s\n" "$icon" "$path"
        done
        print ""
    fi

    if (( unstaged_count > 0 )); then
        print -f "  ${BRIGHT_YELLOW}${BOLD}${ICON_UNSTAGED}${RESET} ${BOLD}UNSTAGED${RESET} ${DIM}(%d)${RESET}\n" "$unstaged_count"
        print -f "  ${DIM}──────────────────────────────────────────────────────${RESET}\n"
        for line in "${unstaged_lines[@]}"; do
            status_code=${line[2,2]}
            path=${line[4,-1]}
            case "$status_code" in
                M) icon="$ICON_FILE_MODIFIED"; color="$BRIGHT_YELLOW" ;;
                D) icon="$ICON_FILE_DELETED"; color="$BRIGHT_RED" ;;
                *) icon="$ICON_FILE_MODIFIED"; color="$BRIGHT_YELLOW" ;;
            esac
            print -f "    ${color}%s${RESET}  %s\n" "$icon" "$path"
        done
        print ""
    fi

    if (( untracked_count > 0 )); then
        print -f "  ${BRIGHT_BLUE}${BOLD}${ICON_UNTRACKED}${RESET} ${BOLD}UNTRACKED${RESET} ${DIM}(%d)${RESET}\n" "$untracked_count"
        print -f "  ${DIM}──────────────────────────────────────────────────────${RESET}\n"
        for line in "${untracked_lines[@]}"; do
            path=${line[4,-1]}
            print -f "    ${BRIGHT_BLUE}${ICON_FILE_UNTRACKED}${RESET}  %s\n" "$path"
        done
        print ""
    fi

    if (( total == 0 )); then
        print -f "  ${BRIGHT_GREEN}${BOLD}${ICON_SYNC}${RESET} ${BOLD}Working tree clean${RESET}\n"
        print ""
    fi
}

function gitlog() {
    if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        print "%F{red}[ERROR]%f Not a git repository."
        exit 1
    fi

    if (( ! $+commands[fzf] )) || (( $# > 0 )); then
        command git log "$@"
        return
    fi

    local copy_cmd
    if (( $+commands[pbcopy] )); then
        copy_cmd="pbcopy"
    elif (( $+commands[wl-copy] )); then
        copy_cmd="wl-copy"
    elif (( $+commands[xclip] )); then
        copy_cmd="xclip -sel c"
    else
        copy_cmd="cat"
    fi

    local color_hash="%C(bold blue)"
    local color_date="%C(dim)"
    local color_auth="%C(yellow)"
    local color_pipe="%C(dim)"
    local reset="%C(reset)"

    local fmt="${color_hash}%h${reset} ${color_pipe}│${reset} %<(40,trunc)%s ${color_pipe}│${reset} ${color_date}%<(14,trunc)%ar${reset} ${color_pipe}│${reset} ${color_auth}%<(18,trunc)%an${reset}"

    local get_hash="grep -oE '[a-f0-9]{7,}' | head -1"

    HEADERS=$'\033[1;4;31mHash\033[0m       \033[1;4;31mMessage\033[0m                                    \033[1;4;31mAge\033[0m               \033[1;4;31mAuthor\033[0m\n'
    KEYS=$'\033[1;33m• Enter:\033[0m  View      \033[1;33m• Ctrl-Y:\033[0m Copy Hash \n\033[1;33m• Ctrl-X:\033[0m Copy Msg  \033[1;33m• Ctrl-O:\033[0m Checkout\n\n'

    git log --graph --color=always --format="$fmt" "$@" | \
    fzf --ansi --no-sort --reverse --tiebreak=index \
        --height=100% --border --layout=reverse --info=inline \
        --header="${KEYS}${HEADERS}" \
        --preview-window=right:42%:wrap \
        --preview "print {} | $get_hash | xargs -I % git show --color=always %" \
        --bind "enter:execute(print {} | $get_hash | xargs -I % sh -c 'git show --color=always % | less -R')" \
        --bind "ctrl-y:execute-silent(print {} | $get_hash | tr -d '\n' | $copy_cmd)+abort" \
        --bind "ctrl-x:execute-silent(print {} | $get_hash | xargs git log -1 --format=%s | tr -d '\n' | $copy_cmd)+abort" \
        --bind "ctrl-o:execute(print {} | $get_hash | xargs git checkout)"
}
