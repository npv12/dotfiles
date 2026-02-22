# AI module - Minimal wrapper around zsh-ai-cmd
# Provides: ai() function for general shell command queries
# Note: generate_commit() is in the git module
# Note: zsh-ai-cmd is loaded in zshrc before modules

# Verify zsh-ai-cmd is available
if ! whence _zsh_ai_cmd_chat > /dev/null; then
  # Try to source it if not already loaded
  ZSH_AI_CMD_PLUGIN="${HOME}/.zsh-ai-cmd/zsh-ai-cmd.plugin.zsh"
  if [[ -f "$ZSH_AI_CMD_PLUGIN" ]]; then
    source "$ZSH_AI_CMD_PLUGIN"
  else
    print -u2 "Error: zsh-ai-cmd not found at $ZSH_AI_CMD_PLUGIN"
    print -u2 "Install with: git clone https://github.com/npv12/zsh-ai-cmd ~/.zsh-ai-cmd"
    return 1
  fi
fi

function ai() {
  emulate -L zsh

  if (( $# == 0 )); then
    echo 'Usage: ai "your command-related question"'
    echo 'Env: AI_MODEL (sets ZSH_AI_CMD_*_MODEL for the provider)'
    return 1
  fi
  local query="$*"

  local prompts_dir="${ZSH_MODULES_DIR}/ai/prompts"
  local system_prompt_file="$prompts_dir/ai-system.txt"

  if [[ ! -f "$system_prompt_file" ]]; then
    echo "Error: system prompt file not found: $system_prompt_file"
    return 1
  fi

  local SYSTEM_PROMPT
  SYSTEM_PROMPT=$(cat "$system_prompt_file")

  _zsh_ai_cmd_chat "$SYSTEM_PROMPT" "$query"
}
