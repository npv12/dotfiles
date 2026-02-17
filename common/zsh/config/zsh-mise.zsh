#!/usr/bin/env zsh

typeset -gi __MISE_AUTO_LOADED=0
typeset -gi __MISE_MANUAL_LOADED=0
typeset -g __MISE_AUTO_LAST_PWD=""
typeset -gA __MISE_TOML_ROOT_CACHE
typeset -g __MISE_NO_ROOT_SENTINEL="__MISE_NO_ROOT__"

function __mise_is_active() {
  [[ -n "${MISE_SHELL:-}" ]] && (( $+functions[_mise_hook_chpwd] ))
}

function __mise_activate() {
  emulate -L zsh

  local mode="${1:-auto}"

  if __mise_is_active; then
    [[ "$mode" == "manual" ]] && __MISE_MANUAL_LOADED=1
    return 0
  fi

  command -v mise &>/dev/null || return 127

  export MISE_HOOK_ENV_CHPWD_ONLY=1
  export MISE_HOOK_ENV_CACHE_TTL="${MISE_HOOK_ENV_CACHE_TTL:-5s}"

  eval "$(mise activate zsh)"

  precmd_functions=( ${precmd_functions:#_mise_hook_precmd} )
  (( $+functions[_mise_hook_precmd] )) && unset -f _mise_hook_precmd
  (( $+functions[__zsh_refresh_completions_for_mise] )) && __zsh_refresh_completions_for_mise

  if [[ "$mode" == "manual" ]]; then
    __MISE_MANUAL_LOADED=1
  else
    __MISE_AUTO_LOADED=1
  fi
}

function __mise_deactivate() {
  emulate -L zsh

  __mise_is_active || return 0
  (( __MISE_MANUAL_LOADED )) && return 0

  mise deactivate &>/dev/null
  __MISE_AUTO_LOADED=0
}

function __mise_find_mise_toml_root() {
  emulate -L zsh

  local dir="$PWD"
  local -a visited=()
  local found=""

  while true; do
    visited+=("$dir")

    if [[ -n "${__MISE_TOML_ROOT_CACHE[$dir]+set}" ]]; then
      found="${__MISE_TOML_ROOT_CACHE[$dir]}"
      break
    fi

    if [[ -f "$dir/mise.toml" || -f "$dir/.mise.toml" || -f "$dir/.tool-versions" ]]; then
      found="$dir"
      break
    fi

    [[ "$dir" == "/" ]] && break
    dir="${dir:h}"
  done

  local cache_value="$found"
  [[ -z "$cache_value" ]] && cache_value="$__MISE_NO_ROOT_SENTINEL"

  local v
  for v in "${visited[@]}"; do
    __MISE_TOML_ROOT_CACHE[$v]="$cache_value"
  done

  if [[ "$found" == "$__MISE_NO_ROOT_SENTINEL" ]]; then
    REPLY=""
  else
    REPLY="$found"
  fi
}

function __mise_auto_hook() {
  emulate -L zsh

  [[ "$PWD" == "$__MISE_AUTO_LAST_PWD" ]] && return 0
  __MISE_AUTO_LAST_PWD="$PWD"

  local root
  __mise_find_mise_toml_root
  root="$REPLY"

  if [[ "$root" == "$__MISE_NO_ROOT_SENTINEL" ]]; then
    root=""
  fi

  if [[ -n "$root" ]]; then
    __mise_activate auto
  else
    (( __MISE_AUTO_LOADED )) && __mise_deactivate
  fi
}

function load-mise() {
  __mise_activate manual
}

autoload -Uz add-zsh-hook
add-zsh-hook chpwd __mise_auto_hook
__mise_auto_hook
