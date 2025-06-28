() {
  function prompt_mise() {
    local plugins=("${(@f)$(mise ls --current 2>/dev/null | awk '!/\(symlink\)/ && $3!="~/.tool-versions" && $3!="~/.config/mise/config.toml" {print $1, $2}')}")
    local plugin
    local mise_env_exported=false

    if [[ -n $(mise env | grep -v '^#' | grep -v '^$' | grep -v '^export PATH=') ]]; then
      mise_env_exported=true
    fi

    for plugin in ${(k)plugins}; do
      local parts=("${(@s/ /)plugin}")
      local tool=${(U)parts[1]}
      local version=${parts[2]}
      p10k segment -r -i "${tool}_ICON" -s $tool -t "$version"
    done

    if $mise_env_exported; then
      p10k segment -r -i "PACKAGE_ICON" -s "MISE" -t "mise"
    fi
  }

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
}
