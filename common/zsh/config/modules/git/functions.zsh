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
        print "\e[31m\e[? Not a git repository.\e[0m"
        exit 1
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

    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    local remote=$(git remote 2>/dev/null | head -n1)
    local ahead behind
    eval "$(git rev-list --left-right --count HEAD...origin/$branch 2>/dev/null | awk '{print "ahead="$1"; behind="$2}')"

    print -f "\n${MAGENTA}${BOLD} %s${RESET}" "$branch"
    if [[ -n "$remote" ]]; then
        [[ "$ahead" -gt 0 ]] && print -n " ${GREEN}⇡$ahead${RESET}"
        [[ "$behind" -gt 0 ]] && print -n " ${RED}⇣$behind${RESET}"
    fi
    print -f "\n${DIM}────────────────────────────────────────────${RESET}\n"

    local staged unstaged untracked
    staged=$(git diff --cached --name-status 2>/dev/null)
    unstaged=$(git diff --name-status 2>/dev/null | grep -v "^$" | comm -13 <(echo "$staged" | sort) <(git diff --name-status 2>/dev/null | sort))
    untracked=$(git ls-files --others --exclude-standard 2>/dev/null)

    if [[ -n "$staged" ]]; then
        print -f "${GREEN}${BOLD} Staged (${RESET}$(echo "$staged" | wc -l | tr -d ' ')${GREEN})${RESET}\n"
        echo "$staged" | while read -r st file; do
            case "$st" in
                A|M) icon=""; color="$GREEN" ;;
                D)   icon=""; color="$RED" ;;
                R)   icon=""; color="$MAGENTA" ;;
                C)   icon=""; color="$MAGENTA" ;;
                *)   icon=""; color="$GREEN" ;;
            esac
            print -f "  ${color}${icon}${RESET}  %s\n" "$file"
        done
    fi

    if [[ -n "$unstaged" ]]; then
        print -f "\n${YELLOW}${BOLD} Unstaged (${RESET}$(echo "$unstaged" | wc -l | tr -d ' ')${YELLOW})${RESET}\n"
        echo "$unstaged" | while read -r st file; do
            case "$st" in
                D) icon=""; color="$RED" ;;
                *) icon=""; color="$YELLOW" ;;
            esac
            print -f "  ${color}${icon}${RESET}  %s\n" "$file"
        done
    fi

    if [[ -n "$untracked" ]]; then
        print -f "\n${CYAN}${BOLD} Untracked (${RESET}$(echo "$untracked" | wc -l | tr -d ' ')${CYAN})${RESET}\n"
        echo "$untracked" | while read -r file; do
            print -f "  ${CYAN}${RESET}  %s\n" "$file"
        done
    fi

    local staged_count=0
    local unstaged_count=0
    local untracked_count=0

    [[ -n "$staged" ]] && staged_count=$(printf "%s\n" "$staged" | wc -l | tr -d ' ')
    [[ -n "$unstaged" ]] && unstaged_count=$(printf "%s\n" "$unstaged" | wc -l | tr -d ' ')
    [[ -n "$untracked" ]] && untracked_count=$(printf "%s\n" "$untracked" | wc -l | tr -d ' ')

    local total=$(( staged_count + unstaged_count + untracked_count ))
    if [[ "$total" -eq 0 ]]; then
        print -f "    ${GREEN}${RESET}  ${DIM}Working tree clean.${RESET}\n"
    else
        print -f "\n${DIM}(%d files changed)${RESET}\n" "$total"
    fi
    print ""
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
