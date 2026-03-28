#!/usr/bin/env zsh

# YT Download
function yt-download() {
    yt-dlp -ciwx --audio-format mp3 --audio-quality 0 -o "%(playlist_index&{} - |)s%(title)s - %(uploader)s - %(upload_date)s.%(ext)s" $1
}

# Just used for testing
function timezsh() {
    for i in $(seq 1 10); do time zsh -i -c exit; done
}

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
