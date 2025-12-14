#!/usr/bin/env zsh

function extract () {
    if [ -f $1 ] ; then
        case $1 in
            *.tar.bz2)   tar xjf $1   ;;
            *.tar.gz)    tar xzf $1   ;;
            *.bz2)       bunzip2 $1   ;;
            *.rar)       unrar x $1     ;;
            *.gz)        gunzip $1    ;;
            *.tar)       tar xvvf $1    ;;
            *.tbz2)      tar xjf $1   ;;
            *.tgz)       tar xzf $1   ;;
            *.zip)       unzip $1     ;;
            *.Z)         uncompress $1;;
            *.7z)        7z x $1      ;;
            *)           echo "'$1' cannot be extracted via extract()" ;;
        esac
    else
        echo "'$1' is not a valid file"
    fi
}

# Git related
function del-multiple-branches() {
    git branch | grep "$1" | xargs git branch -D
}

function del-multiple-remotes() {
    git remote -v | grep "$1" | xargs git remote remove
}

# Pacman
if command -v pacman &> /dev/null; then
    function pac-list() {
        pacman -Qqe | \
        xargs -I '{}' \
        expac "${bold_color}% 20n ${fg_no_bold[white]}%d${reset_color}" '{}'
    }

    function pac-disowned() {
        local tmp db fs
        tmp=${TMPDIR-/tmp}/pacman-disowned-$UID-$$
        db=$tmp/db
        fs=$tmp/fs

        mkdir "$tmp"
        trap 'rm -rf "$tmp"' EXIT

        pacman -Qlq | sort -u > "$db"

        find /bin /etc /lib /sbin /usr ! -name lost+found ! -path '/usr/share/secureboot/*' ! -path '/usr/local/bin/*' ! -path '/etc/doas.conf' \
        \( -type d -printf '%p/\n' -o -print \) | sort > "$fs"

        comm -23 "$fs" "$db"
    }

    alias pacmanallkeys='sudo pacman-key --refresh-keys'

    function pacman-signkeys() {
        local key
        for key in $@; do
            sudo pacman-key --recv-keys $key
            sudo pacman-key --lsign-key $key
            printf 'trust\n3\n' | sudo gpg --homedir /etc/pacman.d/gnupg \
            --no-permission-warning --command-fd 0 --edit-key $key
        done
    }

    if (( $+commands[xdg-open] )); then
        function pac-web() {
            if [[ $# = 0 || "$1" =~ '--help|-h' ]]; then
                local underline_color="\e[${color[underline]}m"
                echo "$0 - open the website of an ArchLinux package"
                echo
                echo "Usage:"
                echo "    $bold_color$0$reset_color ${underline_color}target${reset_color}"
                return 1
            fi

            local pkg="$1"
            local infos="$(LANG=C pacman -Si "$pkg")"
            if [[ -z "$infos" ]]; then
                return
            fi
            local repo="$(grep -m 1 '^Repo' <<< "$infos" | grep -oP '[^ ]+$')"
            local arch="$(grep -m 1 '^Arch' <<< "$infos" | grep -oP '[^ ]+$')"
            xdg-open "https://www.archlinux.org/packages/$repo/$arch/$pkg/" &>/dev/null
        }
    fi
fi

function load-nvm() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
}

function load-python() {
    # Pyenv manager
    if command -v pyenv &> /dev/null; then
        eval "$(pyenv init -)"
        eval "$(pyenv virtualenv-init -)"
    fi
}

function load-mise() {
    eval "$(mise activate zsh)"
}

function load-ros() {
    export ROS_DOMAIN_ID=42
    export ROS_VERSION=1
    export ROS_PYTHON_VERSION=3
    export ROS_DISTRO=noetic
    z4h source /opt/ros/noetic/setup.zsh
}

function load-rust() {
    z4h source "$HOME/.cargo/env"
}

function ros-update() {
    python ~/dotfiles/scripts/update-missing-ros.py
}

function grub-regen() {
    sudo grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=endeavouros && \
    sudo grub-mkconfig -o /boot/grub/grub.cfg
    sudo efibootmgr -c -d /dev/nvme0n1 -p 5 -l \\EFI\\endeavouros\\shimx64.efi -L "endeavouros (secure)"
}

function load-sdkman() {
    export SDKMAN_DIR="$HOME/.sdkman"
    [ -s "$SDKMAN_DIR/bin/sdkman-init.sh" ] && source "$SDKMAN_DIR/bin/sdkman-init.sh"
}


# Sideload android
function rom-sideload() {
    adb reboot sideload-auto-reboot && adb wait-for-device-sideload && adb sideload $1 && rm $1
}

function rom-flashall() {
    #adb reboot fastboot
    for filename in ./*.img; do
        partition=$(basename $filename .img)
        fastboot flash --slot=all $partition $filename
    done
    echo "Done flashing now format and reboot"
}

function rom-extract-and-flash() {
    dump $1
    cd extracted_* && rom-flashall
}

# Wallpapers
function sync-wallpapers() {
  rcp /Personal/Wallpapers/Desktop onedrive:work/Backup/Wallpapers/Desktop --transfers 8
  rcp /Personal/Wallpapers/Phone onedrive:work/Backup/Wallpapers/Phone --transfers 8
}

function sync-pics() {
    PWD=$(pwd)
    cd /Personal/Camera && rcp . "onedrive:work/Backup/camera"
    cd "$PWD"
}

# YT Download
function yt-download() {
    yt-dlp -ciwx --audio-format mp3 --audio-quality 0 -o "%(playlist_index&{} - |)s%(title)s - %(uploader)s - %(upload_date)s.%(ext)s" $1
}

# Just used for testing
function timezsh() {
    for i in $(seq 1 10); do time zsh -i -c exit; done
}

# Kubernetes
function kres(){
  kubectl set env $@ REFRESHED_AT=$(date +%Y%m%d%H%M%S)
}

kxl () {
    if [[ -z "$KUBECONFIG_LOCAL" ]]; then
        export KUBECONFIG_LOCAL=$(mktemp /tmp/kubeconfig-local-XXXXXX)
        kubectl config view --flatten --minify --raw > "$KUBECONFIG_LOCAL"
        export KUBECONFIG="$KUBECONFIG_LOCAL"
    fi
    kubectx "$@"
}

compdef kxl=kubectx


# Utility print functions (json / yaml)
function _build_kubectl_out_alias {
  setopt localoptions norcexpandparam

  # alias function
  eval "function $1 { $2 }"

  # completion function
  eval "function _$1 {
    words=(kubectl \"\${words[@]:1}\")
    _kubectl
  }"

  compdef _$1 $1
}

_build_kubectl_out_alias "kj"  'kubectl "$@" -o json | jq'
_build_kubectl_out_alias "kjx" 'kubectl "$@" -o json | fx'
_build_kubectl_out_alias "ky"  'kubectl "$@" -o yaml | yh'
unfunction _build_kubectl_out_alias

# Pass
function create-password() {
     local pass=$(openssl rand -base64 $1)
     echo $pass
     echo $pass | pbcopy
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
python = "3.11"
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

function ai() {
  emulate -L zsh

  # ---- deps ---------------------------------------------------------------
  for bin in curl jq; do
    if ! command -v "$bin" >/dev/null; then
      echo "Error: '$bin' not found."
      echo "Fix: install with your package manager (e.g., 'brew install $bin' or 'sudo apt -y install $bin')."
      return 127
    fi
  done

  # ---- api key ------------------------------------------------------------
  if [[ -z "$OPENROUTER_API_KEY" ]]; then
    echo "Error: API key not set."
    echo "Fix: export OPENROUTER_API_KEY in your ~/.zshrc"
    return 1
  fi

  # ---- opts ---------------------------------------------------------------
  zmodload zsh/zutil 2>/dev/null || true
  local model="${AI_MODEL:-openai/gpt-oss-20b:free}"
  local temp="${AI_TEMP:-0.5}"

  local -a m_opt t_opt
  zparseopts -E -D m:=m_opt t:=t_opt 2>/dev/null
  [[ ${#m_opt} -gt 0 ]] && model="${m_opt[2]}"
  [[ ${#t_opt} -gt 0 ]] && temp="${t_opt[2]}"

  # ---- query --------------------------------------------------------------
  if (( $# == 0 )); then
    echo 'Usage: ai [-m model] [-t temperature] "your command-related question"'
    return 1
  fi
  local query="$*"

  # ---- system prompt ------------------------------------------------------
  local SYSTEM_PROMPT
  read -r -d '' SYSTEM_PROMPT <<'EOF'
SYSTEM PROMPT: “Zsh Expert, No-Nonsense”

Role:
- You are a senior zsh + Unix CLI expert for macOS & Linux. You recall idiomatic commands for zsh, coreutils, and common tools.

Primary Output Rules:
- If exactly ONE command solves the request: reply with only:
  Here is the command you requested:
  ```zsh
  <command>
````

(No extra text.)

* Otherwise: provide the smallest set of copy-pasteable zsh command blocks needed. Be concise. Avoid chit-chat.

Style & Format:

* Prefer commands over prose. If you must explain, use one-liners prefixed with “Note:”, “Error:”, or “Fix:”.
* Use single quotes by default; double quotes only when expansion is intended.
* Show placeholders as <path>, <pattern>, <port>, <branch>, <container>, etc.
* End option parsing with `--` when relevant.

Assumptions & Detection:

* Assume interactive zsh unless told otherwise. Detect OS/package manager before installs:

  ```zsh
  if command -v apt >/dev/null; then PM="sudo apt -y install"
  elif command -v dnf >/dev/null; then PM="sudo dnf -y install"
  elif command -v pacman >/dev/null; then PM="sudo pacman -S --noconfirm"
  elif command -v brew >/dev/null; then PM="brew install"
  else PM=""; fi
  ```
* Confirm environment minimally when ambiguity would change the command (e.g., GNU vs BSD flags). If unknown, present safe variants labeled “GNU” / “BSD”.

Safety:

* Prefer non-destructive flags: `-i`, `--dry-run`, `-n`. Never suggest `rm -rf` on broad globs; scope paths explicitly.
* Use `sudo` only when required; warn if it’s likely needed.
* For writes, show backup-friendly forms (e.g., `sed -i.bak` on BSD, `sed -i` on GNU).

Scope of Expertise (pick the right tool quickly):

* Shell: zsh options/globbing, parameter expansion, brace/glob qualifiers, history, completion.
* Files & text: grep/rg, find/fd, sed/awk, xargs, cut/sort/uniq, jq, tr, wc, diff/patch.
* Archives & transfer: tar/zip/unzip, rsync, scp/sftp, curl/wget.
* System/process/net: ps/top/htop, pgrep/pkill, lsof, du/df, free/vm_stat, ip/ifconfig, ss/netstat, ufw/firewalld, journalctl/systemctl, launchctl.
* Dev & ops: git, gh, docker/podman, docker compose, kubectl, helm, tmux, fzf, make.
* Package managers: apt/dnf/pacman/brew.

Error Handling (explain briefly + fix):

* “command not found”: suggest install via `$PM <pkg>`.
* “permission denied”: suggest `sudo` or `chmod/chown`.
* “no such file or directory”: verify path or quoting.
* “argument list too long”: switch to `find … -print0 | xargs -0 …`.
* “device or resource busy”: `lsof +D <path>` or `lsof -i :<port>` then stop process.
* “port already in use”: `lsof -i :<port>` then `kill -9 <pid>` (warn before -9).

Common Cross-Platform Switches:

* `sed`: GNU `sed -i`, BSD `sed -i ''`; show both when relevant.
* `date`: prefer portable `date -u +'%Y-%m-%dT%H:%M:%SZ'` and note BSD/GNU diffs only if needed.

Response Patterns (examples, keep minimal):

* One-liner find/replace in-tree:

  ```zsh
  rg -l '<pattern>' | xargs -r sed -i'' -e 's/<from>/<to>/g'
  ```
* JSON query:

  ```zsh
  jq '<jq-filter>' <file.json>
  ```
* Safe recursive delete by pattern (prompting):

  ```zsh
  find <dir> -type f -name '<glob>' -print -ok rm {} \;
  ```
* Port check & kill (with prompt):

  ```zsh
  lsof -i :<port>
  kill -TERM <pid>
  ```

Quality Bar:

* Prefer the shortest correct command that’s readable.
* Offer an alt only when it materially improves portability or safety.
* Do not ask questions if a sensible, safe default exists; otherwise, state one brief “Assumption: …” line.

Reminder:

* No greetings, no filler. Deliver copy-pasteable zsh commands. Explanations only when necessary for errors, ambiguity, or safety.
EOF

  # ---- payload (use jq to avoid quoting bugs) -----------------------------
  local payload
  payload="$(jq -n \
    --arg model "$model" \
    --arg sys "$SYSTEM_PROMPT" \
    --arg usr "$query" \
    --arg temp "$temp" \
    '{model:$model, temperature: ($temp|tonumber),
      messages: [
        {role:"system", content:$sys},
        {role:"user",   content:$usr}
      ] }' )" || {
        echo "Error: failed to build JSON payload."
        return 1
      }

  # ---- request ------------------------------------------------------------
  local response
  response="$(curl -sS https://openrouter.ai/api/v1/chat/completions \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    -H 'Content-Type: application/json' \
    --data-binary "$payload")" || {
      echo "Error: network request failed."
      echo "Fix: check connectivity or proxy settings."
      return 1
    }

  # ---- parse --------------------------------------------------------------
  local content
  content="$(jq -r '.choices[0].message.content // empty' <<<"$response")"

  if [[ -n "$content" ]]; then
    print -r -- "$content"
    return 0
  fi

  # ---- error surface ------------------------------------------------------
  local emsg ecode
  emsg="$(jq -r '.error.message // empty' <<<"$response")"
  ecode="$(jq -r '.error.code // empty' <<<"$response")"
  if [[ -n "$emsg" || -n "$ecode" ]]; then
    [[ -n "$ecode" ]] && echo "Error: $ecode"
    [[ -n "$emsg"  ]] && echo "Error: $emsg"
  else
    echo "⚠️ Something went wrong."
    echo "Raw response:"
    print -r -- "$response"
  fi
}

function generate_commit() {
    emulate -L zsh

    # ---- deps ---------------------------------------------------------------
    for bin in curl jq; do
      if ! command -v "$bin" >/dev/null; then
        echo "Error: '$bin' not found."
        echo "Fix: install with your package manager (e.g., 'brew install $bin' or 'sudo apt -y install $bin')."
        return 127
      fi
    done

    # ---- api key ------------------------------------------------------------
    if [[ -z "$OPENROUTER_API_KEY" ]]; then
      echo "Error: API key not set."
      echo "Fix: export OPENROUTER_API_KEY in your ~/.zshrc"
      return 1
    fi

    # ---- opts ---------------------------------------------------------------
    zmodload zsh/zutil 2>/dev/null || true
    local model="${AI_MODEL:-openai/gpt-oss-20b:free}"
    local temp="${AI_TEMP:-1.1}"

    # Grab staged diff
    local diff
    diff="$(git diff --cached)"

    # If no diff, exit
    if [[ -z "$diff" ]]; then
        echo "No changes to commit."
        return 0
    fi

    # Reject overly large diffs (change limit as needed)
    local diff_lines
    diff_lines=$(printf "%s" "$diff" | wc -l)
    if [ "$diff_lines" -gt 2000 ]; then
        echo "Diff too large; refusing to read."
        return 1
    fi

    # Build AI prompt
    # --- Build system and user prompts ---
    local SYSTEM_PROMPT
    read -r -d '' SYSTEM_PROMPT <<'EOF'
You are an expert Git commit message generator. Follow these rules exactly.

OUTPUT FORMAT:
- Output ONLY a single JSON object and nothing else. No commentary, no code fences.
- JSON shape:
    {
    "title": "<one-line title>",
    "body": "<bullet-lines or empty string>",
    "module": "<module name or '-'>"
    }

MODULE DETECTION RULES:
- Infer the module (scope) from the diff.
- The module is typically the subsystem, directory, feature folder, or conceptual area most affected.
- Choose the smallest meaningful namespace with consistent usage. Examples:
    src/auth/login.js          -> "auth"
    pkg/database/query.ts      -> "database"
    ui/components/Button.tsx   -> "ui"
- If multiple modules appear, choose the one with the *most important* or *most concentrated* changes.
- If no reasonable module exists, return "-".
- The title uses this inferred module unless it is "-".

TITLE RULES:
- Must be exactly one line.
- Pattern: <type>: <module>: <specific change>
- type needs to be of one of the following: feat, fix, docs, style, refactor, test, chore, revert
- If module is "-", omit "<module>: ".
- Be specific and crisp, no trailing period.

BODY RULES:
- Optional. If present: bullet lines starting with "* ".
- No code blocks or diff snippets.
- Max ~6 bullets, <= 120 chars each.

PARSE SAFETY:
- Output MUST be valid JSON. Nothing before or after it.
- If you are unable to generate a commit message, return an empty string for title.

EXAMPLES:
{"title":"feat: auth: add token refresh","body":"- add refresh logic\n- update tests","module":"auth"}
{"title":"fix: db: prevent null dereference","body":"","module":"db"}
EOF

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
5) If any secret is present inside the diff, then mention this information in the title itself so that the user knows, but it is fine to merge (sometimes this is necessary for )
EOF

    # --- Build JSON payload for OpenRouter (chat completions) ---private repos
    # Model can be changed; keep it as an OpenRouter-compatible Anthropic model or other provider you use.
    payload="$(jq -n \
      --arg model "$model" \
      --arg sys "$SYSTEM_PROMPT" \
      --arg usr "$USER_PROMPT" \
      --arg temp "$temp" \
      '{model:$model, temperature: ($temp|tonumber),
        messages: [
          {role:"system", content:$sys},
          {role:"user",   content:$usr}
        ] }' )" || {
        echo "Error: failed to build JSON payload."
        return 1
    }

    local response
    response="$(curl -sS https://openrouter.ai/api/v1/chat/completions \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    -H 'Content-Type: application/json' \
    --data-binary "$payload")" || {
        echo "Error: network request failed."
        echo "Fix: check connectivity or proxy settings."
        return 1
    }

    # Extract AI output
    local ai_output
    ai_output=$(printf "%s" "$response" | jq -r '.choices[0].message.content')

    if [ -z "$ai_output" ] || [ "$ai_output" = "null" ]; then
        echo "AI returned no commit message."
        return 1
    fi

    local title body
    
    title=$(printf "%s" "$ai_output" | jq -r '.title')
    body=$(printf "%s" "$ai_output" | jq -r '.body')
    
    # Commit
    if [ -z "$body" ]; then
        git commit -s -S -v -m "$title"
    else
        git commit -s -S -v -m "$title" -m "$body"
    fi
}


function jqp() {
    pbpaste | sed -E 's/([,{[:space:]]*)([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*:/\1"\2":/g' | jq $@
}
