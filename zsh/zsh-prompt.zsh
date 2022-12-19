#!/bin/sh

## autoload vcs and colors
autoload -Uz vcs_info
autoload -U colors && colors

# enable only git 
zstyle ':vcs_info:*' enable git 

# setup a hook that runs before every ptompt. 
precmd_vcs_info() { vcs_info }
precmd_functions+=( precmd_vcs_info )
setopt prompt_subst

# add a function to check for untracked files in the directory.
# from https://github.com/zsh-users/zsh/blob/master/Misc/vcs_info-examples
zstyle ':vcs_info:git*+set-message:*' hooks git-untracked
# 
+vi-git-untracked(){
    if [[ $(git rev-parse --is-inside-work-tree 2> /dev/null) == 'true' ]] && \
        git status --porcelain | grep '??' &> /dev/null ; then
        hook_com[staged]+='!'
    fi
}

zstyle ':vcs_info:*' check-for-changes true
zstyle ':vcs_info:git:*' formats " %{$fg[blue]%}(%{$fg[red]%}%m%u%c%{$fg[yellow]%}%{$fg[magenta]%} %b%{$fg[blue]%})"

# format our main prompt for hostname current folder, and permissions.
PROMPT="%(?:%{$fg_bold[green]%}生 :%{$fg_bold[red]%}死 )"
PROMPT+='%{$fg[cyan]%}  %c%{$reset_color%} '
PROMPT+="\$vcs_info_msg_0_ "

preexec () {
	timer=$(($(date +%s%0N)/1000000)) 
}

precmd () {
	if [ $timer ]; then
		local now=$(($(date +%s%0N)/1000000)) 
		local elapsed=$(($now-$timer)) 
		local threshold="100" 
        local hours=$(($elapsed/(60 * 60 * 1000)))
        local min=$(($elapsed/(60 * 1000)))
        local sec=$(($elapsed/1000))
        if [ "$elapsed" -le ${threshold} ]; then
            timer_show=""
        elif [ "$elapsed" -le 1000 ]; then
            timer_show="$fg[green]${elapsed}ms"
        elif [ "$elapsed" -le $((60 * 1000)) ]; then
            timer_show="$fg[cyan]${sec}s"
        elif [ "$elapsed" -le $((60 * 60 * 1000)) ]; then
            timer_show="$fg[yellow]${min}min ${sec}s"
        else
            min=$(($min%60))
            timer_show="$fg[red]${hours}h ${min}min ${sec}s"
        fi
        export RPROMPT=$timer_show
		unset timer
	fi
}