#!/usr/bin/env zsh

# YT Download
function yt-download() {
    yt-dlp -ciwx --audio-format mp3 --audio-quality 0 -o "%(playlist_index&{} - |)s%(title)s - %(uploader)s - %(upload_date)s.%(ext)s" $1
}

# Just used for testing
function timezsh() {
    for i in $(seq 1 10); do time zsh -i -c exit; done
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
