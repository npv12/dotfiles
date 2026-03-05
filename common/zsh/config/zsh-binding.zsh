#!/usr/bin/env zsh

case "$(uname -s)" in
  Darwin)
    zstyle ':z4h:bindkey' keyboard 'mac'
    ;;
  Linux)
    zstyle ':z4h:bindkey' keyboard 'pc'
    ;;
  *)
    zstyle ':z4h:' start-tmux command tmux -u new -A -D -t z4h
    zstyle ':z4h:bindkey' keyboard 'pc'
    ;;
esac
