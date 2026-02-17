() {
  local this_file="${(%):-%x}"
  local impl="${this_file:A:h}/p10k.mise.impl.zsh"
  [[ -f "$impl" ]] && source "$impl"
}
