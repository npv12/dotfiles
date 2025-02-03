() {
  function prompt_mise() {
    local plugins=("${(@f)$(mise ls --current 2>/dev/null | awk '!/\(symlink\)/ && $3!="~/.tool-versions" && $3!="~/.config/mise/config.toml" {print $1, $2}')}")
    local plugin
    local mise_env_exported=false
    
    # Ignore path exported by mise since it is always exported
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

  # Substitute the default asdf prompt element
  typeset -g POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=("${POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS[@]/asdf/mise}")
  typeset -g POWERLEVEL9K_MISE_PYTHON_FOREGROUND=3
  typeset -g POWERLEVEL9K_MISE_NODE_FOREGROUND=2
  typeset -g POWERLEVEL9K_MISE_RUST_FOREGROUND=215
  typeset -g POWERLEVEL9K_MISE_GO_FOREGROUND=6
  typeset -g POWERLEVEL9K_MISE_ENV_FOREGROUND=4
  typeset -g POWERLEVEL9K_MISE_FOREGROUND=212
}