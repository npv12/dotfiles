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

# Fix up a commit and rebase --autosquash
# Usage: gfix <commit-hash>
gfix() {
  git commit --fixup $1 && git rebase -i --autosquash $1^
}
