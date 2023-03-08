#! /usr/bin/zsh

paru -S lightly-qt latte-dock-git kwalletmanager ksshaskpass plasma-wayland-session plasma-workspace-agent-ssh
git clone https://github.com/npv12/kde catppuccin-kde && cd catppuccin-kde && ./install.sh

# Required by ssh agent to work well
ln -s ~/dotfiles/autostart/ssh-add.desktop ~/.config/autostart/ssh-add.desktop