# AI module — wrapper around zsh-ai-cmd (loaded in ~/.zshrc via z4h load npv12/zsh-ai-cmd).
# generate_commit() lives in the git module.

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
