export ZSH_DIR="${ZDOTDIR}/.config/zsh"
# Periodic auto-update on Zsh startup: 'ask' or 'no'.
# You can manually run `z4h update` to update everything.
zstyle ':z4h:' auto-update      'no'
# Ask whether to auto-update this often; has no effect if auto-update is 'no'.
zstyle ':z4h:' auto-update-days '28'

# Keyboard type: 'mac' or 'pc'.
zstyle ':z4h:bindkey' keyboard  'pc'

# Don't start tmux.
zstyle ':z4h:' start-tmux       no

# Mark up shell's output with semantic information.
zstyle ':z4h:' term-shell-integration 'yes'

# Right-arrow key accepts one character ('partial-accept') from
# command autosuggestions or the whole thing ('accept')?
zstyle ':z4h:autosuggestions' forward-char 'accept'

# Recursively traverse directories when TAB-completing files.
zstyle ':z4h:fzf-complete' recurse-dirs 'no'

# Enable direnv to automatically source .envrc files.
zstyle ':z4h:direnv'         enable 'yes'
# Show "loading" and "unloading" notifications from direnv.
zstyle ':z4h:direnv:success' notify 'yes'

# Enable ('yes') or disable ('no') automatic teleportation of z4h over
# SSH when connecting to these hosts.
# The default value if none of the overrides above match the hostname.
zstyle ':z4h:ssh:*'                   enable 'yes'

# Send these files over to the remote host when connecting over SSH to the
# enabled hosts.
zstyle ':z4h:ssh:*' send-extra-files '~/.config/zsh'

# FZF
zstyle ':z4h:*' fzf-flags --color=hl:1,hl+:2

# Clone additional Git repositories from GitHub.
z4h install hlissner/zsh-autopair || return 
z4h install bigH/git-fuzzy || return
z4h install MichaelAquilina/zsh-you-should-use || return

function zsh_add_file() {
    local filename=$(echo "$1" | sed 's/\(.*\)\..*/\1/') # Strip out any extension
    [ -f "$ZSH_DIR/$filename.zsh" ] && z4h source "$ZSH_DIR/$filename.zsh"
}

# If on rom server
hosts=($(echo $(hostname -i) | tr " " "\n"))
for host in "${hosts[@]}"; do
    if [ "$host" = "65.108.202.40" ]; then
        zsh_add_file "build-scripts/setup"
    fi
done

# Install or update core components (fzf, zsh-autosuggestions, etc.) and
# initialize Zsh. After this point console I/O is unavailable until Zsh
# is fully initialized. Everything that requires user interaction or can
# perform network I/O must be done above. Everything else is best done below.
z4h init || return

# Extend PATH.
path=(~/bin $path)

# Additional repos
z4h load hlissner/zsh-autopair
z4h load bigH/git-fuzzy
z4h source ${Z4H}/MichaelAquilina/zsh-you-should-use/you-should-use.plugin.zsh # Manually load it instead since z4h doesn't support it

# Define key bindings.
z4h bindkey z4h-cd-back    Alt+Left   # cd into the previous directory
z4h bindkey z4h-cd-forward Alt+Right  # cd into the next directory
z4h bindkey z4h-cd-up      Alt+Up     # cd into the parent directory
z4h bindkey z4h-cd-down    Alt+Down   # cd into a child directory

# Autoload functions.
autoload -Uz zmv

# Define aliases.
alias tree="tree -a -I .git"

# Set shell options: http://zsh.sourceforge.net/Doc/Release/Options.html.
setopt glob_dots     # no special treatment for file names with a leading dot
setopt no_auto_menu  # require an extra TAB press to open the completion menu
setopt correct_all

z4h source "$ZSH_DIR/controller.zsh"
z4h source "$ZSH_DIR/.p10k.zsh"

# Cargo
z4h source "$HOME/.cargo/env"

# Zoxide rocks
if command -v zoxide &> /dev/null; then
    eval "$(zoxide init zsh)"
fi
