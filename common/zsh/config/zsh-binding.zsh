#!/usr/bin/env zsh

if [[ $(uname) == "Darwin" ]]; then
    # Mac keybindings
    zstyle ':z4h:autosuggestions' forward-char 'partial-accept'
    zstyle ':z4h:ssh:*'                   enable 'no'
else
    # Linux keybindings
    zstyle ':z4h:autosuggestions' forward-char 'accept'

    # Enable ('yes') or disable ('no') automatic teleportation of z4h over
    # SSH when connecting to these hosts.
    # zstyle ':z4h:ssh:*.example-hostname2' enable 'no'
    # The default value if none of the overrides above match the hostname.
    zstyle ':z4h:ssh:*'                   enable 'yes'
    
    # Start tmux automatically
    zstyle ':z4h:' start-tmux command tmux -u new -A -D -t z4h
fi