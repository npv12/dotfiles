function _ai_chat() {
  emulate -L zsh

  local system_prompt="${1:-}"
  local user_prompt="${2:-}"

  if [[ -z "$system_prompt" || -z "$user_prompt" ]]; then
    echo "Error: missing prompts."
    echo "Usage: _ai_chat <system_prompt> <user_prompt>"
    return 1
  fi

  for bin in curl jq pass; do
    if ! command -v "$bin" >/dev/null; then
      echo "Error: '$bin' not found."
      echo "Fix: install with your package manager (e.g., 'brew install $bin' or 'sudo apt -y install $bin')."
      return 127
    fi
  done

  local model="${AI_MODEL:-openai/gpt-oss-120b:free}"
  local temp="${AI_TEMP:-0.5}"
  local openrouter_api_key
  openrouter_api_key="$(pass tokens/openrouter 2>/dev/null || echo "")"

  local synthetic_api_key
  synthetic_api_key="$(pass tokens/synthetic/simbian 2>/dev/null || echo "")"

  local synthetic_model="${AI_SYNTHETIC_MODEL:-hf:moonshotai/Kimi-K2.5}"
  local synthetic_temp="${AI_SYNTHETIC_TEMP:-$temp}"
  local fallback_to_synthetic="${AI_FALLBACK_TO_SYNTHETIC:-}"

  local payload response content

  if [[ -n "$openrouter_api_key" ]]; then
    payload="$(jq -n \
      --arg model "$model" \
      --arg sys "$system_prompt" \
      --arg usr "$user_prompt" \
      --arg temp "$temp" \
      '{model:$model, temperature: ($temp|tonumber),
        messages: [
          {role:"system", content:$sys},
          {role:"user",   content:$usr}
        ] }' )" || {
          echo "Error: failed to build JSON payload."
          return 1
        }

    response="$(curl -sS https://openrouter.ai/api/v1/chat/completions \
      -H "Authorization: Bearer $openrouter_api_key" \
      -H 'Content-Type: application/json' \
      --data-binary "$payload")" || {
        response=""
      }

    content="$(printf "%s" "$response" | jq -r '.choices[0].message.content' 2>/dev/null)" || content=""

    if [[ -z "$content" || "$content" == "null" ]]; then
      if [[ -n "$fallback_to_synthetic" && -n "$synthetic_api_key" ]]; then
        printf "OpenRouter failed, falling back to Synthetic... "
      else
        printf "%s\n" "$response" >&2
        return 1
      fi
    else
      printf "%s\n" "$content"
      return 0
    fi
  fi

  if [[ -n "$synthetic_api_key" ]]; then
    payload="$(jq -n \
      --arg model "$synthetic_model" \
      --arg sys "$system_prompt" \
      --arg usr "$user_prompt" \
      --arg temp "$synthetic_temp" \
      '{model:$model, temperature: ($temp|tonumber),
        messages: [
          {role:"system", content:$sys},
          {role:"user",   content:$usr}
        ] }' )" || {
          echo "Error: failed to build JSON payload for Synthetic."
          return 1
        }

    response="$(curl -sS https://api.synthetic.ai/v1/chat/completions \
      -H "Authorization: Bearer $synthetic_api_key" \
      -H 'Content-Type: application/json' \
      --data-binary "$payload")" || {
        echo "Error: curl failed." >&2
        return 1
      }

    content="$(printf "%s" "$response" | jq -r '.choices[0].message.content' 2>/dev/null)" || content=""

    if [[ -z "$content" || "$content" == "null" ]]; then
      printf "%s\n" "$response" >&2
      return 1
    fi

    printf "%s\n" "$content"
    return 0
  fi

  echo "Error: no API key found." >&2
  return 1
}

function ai() {
  emulate -L zsh

  if (( $# == 0 )); then
    echo 'Usage: ai "your command-related question"'
    echo 'Env: AI_MODEL, AI_TEMP, AI_FALLBACK_TO_SYNTHETIC=1, AI_SYNTHETIC_MODEL'
    return 1
  fi
  local query="$*"

  local prompts_dir="${0:A:h}/prompts"
  local system_prompt_file="$prompts_dir/ai-system.txt"

  if [[ ! -f "$system_prompt_file" ]]; then
    echo "Error: system prompt file not found: $system_prompt_file"
    return 1
  fi

  local SYSTEM_PROMPT
  SYSTEM_PROMPT=$(cat "$system_prompt_file")

  _ai_chat "$SYSTEM_PROMPT" "$query"
}
