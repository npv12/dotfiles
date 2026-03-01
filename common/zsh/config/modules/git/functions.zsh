function del-multiple-branches() {
    git branch | grep "$1" | xargs git branch -D
}

function del-multiple-remotes() {
    git remote -v | grep "$1" | xargs git remote remove
}

function gitcheckout() {
    emulate -L zsh

    if (( $# > 0 )) || (( ! $+commands[fzf] )); then
        command git checkout "$@"
        return
    fi

    if ! command git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        print -u2 "Not a git repository."
        return 1
    fi

    local selection branch
    selection=$(
        command git for-each-ref \
            --sort=-committerdate \
            --format=$'%(refname:short)\t%(refname)\t%(committerdate:relative)\t%(subject)' \
            refs/heads refs/remotes |
            awk -F'\t' '$1 !~ /\/HEAD$/ { print }' |
            fzf --ansi \
                --height=100% \
                --layout=reverse \
                --border \
                --delimiter=$'\t' \
                --with-nth=1,3,4 \
                --prompt="Checkout branch > " \
                --preview='git log --graph --decorate --color=always --oneline --max-count=60 {1}' \
                --preview-window='right,65%,border-left'
    ) || return

    branch=${selection%%$'\t'*}
    [[ -z "$branch" ]] && return

    if command git show-ref --verify --quiet "refs/heads/$branch"; then
        command git checkout "$branch"
        return
    fi

    if [[ "$branch" == */* ]] && command git show-ref --verify --quiet "refs/remotes/$branch"; then
        local local_branch="${branch#*/}"
        if command git show-ref --verify --quiet "refs/heads/$local_branch"; then
            command git checkout "$local_branch"
        else
            command git checkout --track -b "$local_branch" "$branch"
        fi
        return
    fi

    command git checkout "$branch"
}

function generate_commit() {
    emulate -L zsh

    # Ensure zsh-ai-cmd is available (loaded in zshrc, but check anyway)
    if ! whence _zsh_ai_cmd_chat > /dev/null; then
        print -u2 "Error: zsh-ai-cmd not loaded."
        print -u2 "Install with: git clone https://github.com/npv12/zsh-ai-cmd ~/.zsh-ai-cmd"
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
    ai_output="$(_zsh_ai_cmd_chat "$SYSTEM_PROMPT" "$USER_PROMPT")" || return $?

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
    emulate -L zsh

    if ! command git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        print -u2 "Not a git repository."
        return 1
    fi

    if (( $# > 0 )) || (( ! $+commands[fzf] )); then
        command git status "$@"
        return
    fi

    local entries
    entries=$(
        command git status --porcelain=v1 --untracked-files=all |
            awk '{
                x = substr($0, 1, 1)
                status = substr($0, 1, 2)
                path = substr($0, 4)
                icon = (x != " " && status != "??") ? "\033[32m+\033[0m" : " "
                if (status != "??" && index(path, " -> ") > 0) {
                    path = substr(path, index(path, " -> ") + 4)
                }
                print icon "\t" status "\t" path
            }'
    )

    if [[ -z "$entries" ]]; then
        print "Working tree clean."
        return
    fi

    print -r -- "$entries" |
        fzf --ansi \
            --height=100% \
            --layout=reverse \
            --border \
            --delimiter=$'\t' \
            --with-nth=1,3 \
            --multi \
            --prompt="Status > " \
            --bind='enter:execute-silent(
                while IFS=$'\''\t'\'' read -r _icon file_status file; do
                    if [[ -z "$file" ]]; then
                        continue
                    fi
                    if [[ "${file_status:0:1}" != " " && "$file_status" != "??" ]]; then
                        git restore --staged -- "$file" 2>/dev/null || git reset HEAD -- "$file"
                    else
                        git add -- "$file"
                    fi
                done < {+f}
            )+abort' \
            --preview='
                line_status=$(printf "%s" {} | cut -f2)
                file=$(printf "%s" {} | cut -f3-)

                if [[ "$line_status" == "??" ]]; then
                    git diff --no-index --color=always -- /dev/null "$file" 2>/dev/null || sed -n "1,200p" "$file"
                    exit 0
                fi

                echo "UNSTAGED"
                git diff --color=always -- "$file"
                echo
                echo "STAGED"
                git diff --cached --color=always -- "$file"
            ' \
            --preview-window='right,65%,border-left'
}

function gitdiff() {
    emulate -L zsh

    if ! command git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        print -u2 "Not a git repository."
        return 1
    fi

    if (( $# > 0 )) || (( ! $+commands[fzf] )); then
        command git diff "$@"
        return
    fi

    local files
    files=$(
        {
            command git diff --name-only
            command git diff --cached --name-only
        } | awk 'NF && !seen[$0]++'
    )

    if [[ -z "$files" ]]; then
        print "No changes to diff."
        return
    fi

    print -r -- "$files" |
        fzf --ansi \
            --height=100% \
            --layout=reverse \
            --border \
            --prompt="Diff > " \
            --preview='
                file={}
                echo "UNSTAGED"
                git diff --color=always -- "$file"
                echo
                echo "STAGED"
                git diff --cached --color=always -- "$file"
            ' \
            --preview-window='right,65%,border-left'
}

function gitlog() {
    emulate -L zsh

    if ! command git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        print -u2 "Not a git repository."
        return 1
    fi

    if (( $# > 0 )) || (( ! $+commands[fzf] )); then
        command git log "$@"
        return
    fi

    local commits
    commits=$(
        command git log --all --date=short \
            --pretty=format:'%H%x09%h%x09%an%x09%ad%x09%s' |
            awk -F'\t' '
                function trunc(s, w) {
                    if (length(s) <= w) return s
                    if (w <= 3) return substr(s, 1, w)
                    return substr(s, 1, w - 3) "..."
                }
                BEGIN {
                    msg_w = 30
                    esc = sprintf("%c", 27)
                    c_hash = esc "[36m"
                    c_author = esc "[33m"
                    c_date = esc "[32m"
                    c_reset = esc "[0m"
                }
                {
                    search_key = tolower($1 " " $2 " " $3)
                    msg = sprintf("%-*s", msg_w, trunc($5, msg_w))
                    printf "%s\t%s\t%s\t%s%s%s\t%s%s%s %s%s%s\n",
                        search_key,
                        $1,
                        msg,
                        c_hash, $2, c_reset,
                        c_date, $4, c_reset,
                        c_author, $3, c_reset
                }
            '
    )

    if [[ -z "$commits" ]]; then
        print "No commits found."
        return
    fi

    print -r -- "$commits" |
        fzf --ansi \
            --height=100% \
            --layout=reverse \
            --border \
            --ignore-case \
            --delimiter=$'\t' \
            --with-nth=3,4,5 \
            --nth=1 \
            --prompt="Log > " \
            --bind='enter:execute-silent(echo -n {2} | pbcopy)+abort' \
            --bind='ctrl-o:execute(git checkout {2})+abort' \
            --preview='git show --color=always --stat --patch --decorate=short {2}' \
            --preview-window='right,65%,border-left'
}
