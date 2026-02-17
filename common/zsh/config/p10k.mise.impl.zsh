typeset -g __P10K_MISE_CACHE_DIR=""
typeset -ga __P10K_MISE_CACHE_LINES=()

function __p10k_mise_update_cache() {
  emulate -L zsh

  if ! (( $+functions[_mise_hook_chpwd] )); then
    __P10K_MISE_CACHE_DIR=""
    __P10K_MISE_CACHE_LINES=()
    return 0
  fi

  [[ "$PWD" == "$__P10K_MISE_CACHE_DIR" ]] && return 0
  __P10K_MISE_CACHE_DIR="$PWD"

  local line
  local -a parts
  local tool
  local version
  local source
  local -a current_lines

  current_lines=("${(@f)$(mise ls --current 2>/dev/null)}")
  __P10K_MISE_CACHE_LINES=()

  for line in "${current_lines[@]}"; do
    [[ "$line" == *"(symlink)"* ]] && continue

    parts=(${=line})
    tool="${parts[1]:-}"
    version="${parts[2]:-}"
    source="${parts[3]:-}"

    [[ -z "$tool" || -z "$version" ]] && continue
    [[ "$tool" == "Tool" && "$version" == "Version" ]] && continue
    [[ "$source" == "~/.tool-versions" || "$source" == "~/.config/mise/config.toml" ]] && continue

    __P10K_MISE_CACHE_LINES+=("$tool $version")
  done

  if (( ${#__P10K_MISE_CACHE_LINES[@]} == 1 )) && [[ -z "${__P10K_MISE_CACHE_LINES[1]}" ]]; then
    __P10K_MISE_CACHE_LINES=()
  fi
}

function prompt_mise() {
  local plugin
  __p10k_mise_update_cache

  (( ${#__P10K_MISE_CACHE_LINES[@]} )) || return 0

  local -a tools_to_skip=(
    "asdf"
    "just"
    "uv"
    "opencode"
  )

  for plugin in "${__P10K_MISE_CACHE_LINES[@]}"; do
    [[ -z "$plugin" ]] && continue
    local parts=("${(@s/ /)plugin}")
    local tool=${(U)parts[1]}
    local version=${parts[2]}
    [[ -z "$tool" ]] && continue
    if [[ ! " ${(U)tools_to_skip[@]} " =~ " ${tool} " ]]; then
      p10k segment -r -i "${tool}_ICON" -s "$tool" -t "$version"
    fi
  done
}

autoload -Uz add-zsh-hook
add-zsh-hook chpwd __p10k_mise_update_cache
__p10k_mise_update_cache

# Replace 'asdf' with 'mise' in the right prompt
typeset -g POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=("${POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS[@]/asdf/mise}")

# Segment colors
typeset -g POWERLEVEL9K_MISE_PYTHON_FOREGROUND=0
typeset -g POWERLEVEL9K_MISE_PYTHON_BACKGROUND=3
typeset -g POWERLEVEL9K_MISE_NODE_FOREGROUND=0
typeset -g POWERLEVEL9K_MISE_NODE_BACKGROUND=2
typeset -g POWERLEVEL9K_MISE_RUST_FOREGROUND=0
typeset -g POWERLEVEL9K_MISE_RUST_BACKGROUND=215
typeset -g POWERLEVEL9K_MISE_GO_FOREGROUND=0
typeset -g POWERLEVEL9K_MISE_GO_BACKGROUND=6
typeset -g POWERLEVEL9K_MISE_ENV_BACKGROUND=0
typeset -g POWERLEVEL9K_MISE_ENV_FOREGROUND=4
typeset -g POWERLEVEL9K_MISE_FOREGROUND=0
typeset -g POWERLEVEL9K_MISE_BACKGROUND=212
