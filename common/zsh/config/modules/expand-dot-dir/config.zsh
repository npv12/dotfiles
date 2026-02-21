#!/usr/bin/env zsh

function expand-dot-to-parent-directory-path {
  if [[ $LBUFFER = *.. ]]; then
    LBUFFER+='/..'
  else
    LBUFFER+='.'
  fi
}
zle -N expand-dot-to-parent-directory-path

for keymap in 'emacs' 'viins'; do
  bindkey -M "$keymap" "." expand-dot-to-parent-directory-path
done
