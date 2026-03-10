# Dotfiles

These are my personal dotfiles. They are set up for the way I work, so treat this repo as something to borrow from, not something to copy blindly.

The repo has shared config in `common/` and platform-specific setup in `linux/`, `mac/`, and `wsl/`.

## What's here

- `common/` holds the stuff I use across machines: zsh, tmux, Neovim, git, terminal tools, and a few editor configs.
- `linux/`, `mac/`, and `wsl/` contain install and linking scripts for each environment.
- `scripts/setup.sh` detects the current OS and runs the right setup steps.
- `assets/` has fonts, icons, and a few extras used by the desktop configs.

Some notes:

- The zsh setup uses [zsh4humans](https://github.com/romkatv/zsh4humans).
- The Neovim config started from [LazyVim's starter](https://github.com/LazyVim/starter) and has been tweaked from there.
- A lot of the color choices were borrowed from [Catppuccin](https://github.com/catppuccin).

## Install

This repo expects to live at `~/dotfiles`.

```sh
git clone https://github.com/npv12/dotfiles.git "$HOME/dotfiles"
cd "$HOME/dotfiles"
./scripts/setup.sh
```

The setup script links the right files into your home directory and then runs the platform-specific install script.

Before you run it:

- On macOS, have Homebrew installed first.
- On Linux, the install script is written for Arch.
- On WSL, the setup uses `apt`.

If you only want a few configs, it is probably easier to copy or symlink them by hand from `common/`.

## Thanks

- [Catppuccin](https://github.com/catppuccin)
- [LazyVim](https://github.com/LazyVim/LazyVim)
