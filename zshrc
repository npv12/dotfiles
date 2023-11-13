export ZSH_DIR="${ZDOTDIR}/.config/zsh"
# Periodic auto-update on Zsh startup: 'ask' or 'no'.
# You can manually run `z4h update` to update everything.
zstyle ':z4h:' auto-update      'no'
# Ask whether to auto-update this often; has no effect if auto-update is 'no'.
zstyle ':z4h:' auto-update-days '28'

# Keyboard type: 'mac' or 'pc'.
zstyle ':z4h:bindkey' keyboard  'pc'

# Start tmux automatically
zstyle ':z4h:' start-tmux command tmux -u new -A -D -t main

# Mark up shell's output with semantic information.
zstyle ':z4h:' term-shell-integration 'yes'

# Right-arrow key accepts one character ('partial-accept') from
# command autosuggestions or the whole thing ('accept')?
zstyle ':z4h:autosuggestions' forward-char 'accept'

# Recursively traverse directories when TAB-completing files.
zstyle ':z4h:fzf-complete' recurse-dirs 'yes'

# Enable direnv to automatically source .envrc files.
zstyle ':z4h:direnv'         enable 'yes'
# Show "loading" and "unloading" notifications from direnv.
zstyle ':z4h:direnv:success' notify 'no'

# Enable ('yes') or disable ('no') automatic teleportation of z4h over
# SSH when connecting to these hosts.
# zstyle ':z4h:ssh:*.example-hostname2' enable 'no'
# The default value if none of the overrides above match the hostname.
zstyle ':z4h:ssh:*'                   enable 'yes'

# Send these files over to the remote host when connecting over SSH to the
# enabled hosts.
zstyle ':z4h:ssh:*' send-extra-files '~/.config/zsh'

# FZF
zstyle ':z4h:*' fzf-flags --color=hl:1,hl+:2

# Clone additional Git repositories from GitHub.
z4h install romkatv/zsh-defer hlissner/zsh-autopair bigH/git-fuzzy MichaelAquilina/zsh-you-should-use MichaelAquilina/zsh-autoswitch-virtualenv || return

function zsh_add_file() {
    local filename=$(echo "$1" | sed 's/\(.*\)\..*/\1/') # Strip out any extension
    [ -f "$ZSH_DIR/$filename.zsh" ] && z4h source "$ZSH_DIR/$filename.zsh"
}

# If on rom server
if command -v hostname &> /dev/null; then
    hosts=($(echo $(hostname -i) | tr " " "\n"))
    for host in "${hosts[@]}"; do
        if [ "$host" = "65.108.202.40" ]; then
            zsh_add_file "build-scripts/setup"
        fi
    done
fi

# Install or update core components (fzf, zsh-autosuggestions, etc.) and
# initialize Zsh. After this point console I/O is unavailable until Zsh
# is fully initialized. Everything that requires user interaction or can
# perform network I/O must be done above. Everything else is best done below.
z4h init || return

# Additional repos
z4h load hlissner/zsh-autopair bigH/git-fuzzy romkatv/zsh-defer
z4h source $Z4H/MichaelAquilina/zsh-you-should-use/you-should-use.plugin.zsh # Manually load it instead since z4h doesn't support it
z4h source $Z4H/MichaelAquilina/zsh-autoswitch-virtualenv/autoswitch_virtualenv.plugin.zsh

# Define key bindings.
z4h bindkey z4h-backward-kill-word  Ctrl+Backspace     Ctrl+H
z4h bindkey z4h-backward-kill-zword Ctrl+Alt+Backspace

z4h bindkey undo Ctrl+/ Shift+Tab  # undo the last command line change
z4h bindkey redo Alt+/             # redo the last undone command line change

z4h bindkey z4h-cd-back    Alt+Left   # cd into the previous directory
z4h bindkey z4h-cd-forward Alt+Right  # cd into the next directory
z4h bindkey z4h-cd-up      Alt+Up     # cd into the parent directory
z4h bindkey z4h-cd-down    Alt+Down   # cd into a child directory

# Autoload functions.
autoload -Uz zmv

# Set shell options: http://zsh.sourceforge.net/Doc/Release/Options.html.
setopt glob_dots     # no special treatment for file names with a leading dot
setopt no_auto_menu  # require an extra TAB press to open the completion menu
setopt correct_all

zsh_add_file "controller"
z4h source "$ZSH_DIR/p10k.zsh"
