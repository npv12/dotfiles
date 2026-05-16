export ZSH_AI_CMD_PROVIDER='nvidia'
export ZSH_AI_CMD_API_KEY_COMMAND='pass show tokens/${provider}' # pragma: allowlist secret start

# Pi alias with Ollama API key
alias pi='OLLAMA_API_KEY="$(pass show tokens/ollama)" pi'
