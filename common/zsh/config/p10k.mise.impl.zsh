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

  local -A tools_to_show=(
    [python]=1
    [java]=1
    [node]=1
    [yarn]=1
    [go]=1
    [rust]=1
    # Common language/runtime backends verified from `mise registry`.
    [bun]=1
    [clojure]=1
    [crystal]=1
    [dart]=1
    [deno]=1
    [dotnet]=1
    [ruby]=1
    [php]=1
    [lua]=1
    [elixir]=1
    [erlang]=1
    [ghc]=1
    [groovy]=1
    [julia]=1
    [kotlin]=1
    [perl]=1
    [scala]=1
    [swift]=1
    [zig]=1
  )

  for plugin in "${__P10K_MISE_CACHE_LINES[@]}"; do
    [[ -z "$plugin" ]] && continue
    local parts=("${(@s/ /)plugin}")
    local tool_key=${(L)parts[1]}
    local version=${parts[2]}
    case "$tool_key" in
      nodejs) tool_key=node ;;
      golang) tool_key=go ;;
      dotnet-core) tool_key=dotnet ;;
    esac
    local tool=${(U)tool_key}
    [[ -z "$tool" ]] && continue
    [[ -n "${tools_to_show[$tool_key]}" ]] || continue
    p10k segment -r -i "${tool}_ICON" -s "$tool" -t "$version"
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
typeset -g POWERLEVEL9K_MISE_JAVA_FOREGROUND=0
typeset -g POWERLEVEL9K_MISE_JAVA_BACKGROUND=4
typeset -g POWERLEVEL9K_MISE_YARN_FOREGROUND=0
typeset -g POWERLEVEL9K_MISE_YARN_BACKGROUND=6
typeset -g POWERLEVEL9K_MISE_RUST_FOREGROUND=0
typeset -g POWERLEVEL9K_MISE_RUST_BACKGROUND=215
typeset -g POWERLEVEL9K_MISE_GO_FOREGROUND=0
typeset -g POWERLEVEL9K_MISE_GO_BACKGROUND=6
typeset -g POWERLEVEL9K_MISE_ENV_BACKGROUND=0
typeset -g POWERLEVEL9K_MISE_ENV_FOREGROUND=4
typeset -g POWERLEVEL9K_MISE_FOREGROUND=0
typeset -g POWERLEVEL9K_MISE_BACKGROUND=212
