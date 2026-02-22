# tabtab source for packages
[[ -f ~/.config/tabtab/zsh/__tabtab.zsh ]] && . ~/.config/tabtab/zsh/__tabtab.zsh || true

# Add custom completions to fpath
fpath+=("$ZSH_DIR/completions")

typeset -gi __ZSH_COMPLETIONS_NGROK_LOADED=0
typeset -gi __ZSH_COMPLETIONS_JUST_LOADED=0
typeset -gi __ZSH_COMPLETIONS_NGROK_AVAILABLE=-1
typeset -gi __ZSH_COMPLETIONS_JUST_AVAILABLE=-1

function __zsh_refresh_completions_for_mise() {
    emulate -L zsh

    local ngrok_completion_script
    local just_completion_script

    if (( __ZSH_COMPLETIONS_NGROK_AVAILABLE < 0 )); then
        if command -v ngrok &> /dev/null; then
            __ZSH_COMPLETIONS_NGROK_AVAILABLE=1
        else
            __ZSH_COMPLETIONS_NGROK_AVAILABLE=0
        fi
    fi

    if (( __ZSH_COMPLETIONS_NGROK_AVAILABLE )) && (( ! __ZSH_COMPLETIONS_NGROK_LOADED )); then
        ngrok_completion_script="$(ngrok completion zsh)" || ngrok_completion_script=""
        [[ -n "$ngrok_completion_script" ]] && eval "$ngrok_completion_script" && __ZSH_COMPLETIONS_NGROK_LOADED=1
    fi

    if (( __ZSH_COMPLETIONS_JUST_AVAILABLE < 0 )); then
        if command -v just &> /dev/null; then
            __ZSH_COMPLETIONS_JUST_AVAILABLE=1
        else
            __ZSH_COMPLETIONS_JUST_AVAILABLE=0
        fi
    fi

    if (( __ZSH_COMPLETIONS_JUST_AVAILABLE )) && (( ! __ZSH_COMPLETIONS_JUST_LOADED )); then
        just_completion_script="$(just --completions zsh)" || just_completion_script=""
        [[ -n "$just_completion_script" ]] && eval "$just_completion_script" && __ZSH_COMPLETIONS_JUST_LOADED=1
    fi
}
