#! /usr/bin/zsh

paru -S lightly-qt lightlyshaders-git latte-dock-git kwalletmanager ksshaskpass plasma-wayland-session plasma-workspace-agent-ssh libdbusmenu-glib
git clone https://github.com/npv12/kde catppuccin-kde && cd catppuccin-kde && ./install.sh


# Required by ssh agent to work well
ln -s ~/dotfiles/autostart/ssh-add.desktop ~/.config/autostart/ssh-add.desktop
ln -s ~/dotfiles/latte/npv12.layout.latte latte/
ln -s ~/dotfiles/plasmoids ~/.local/share/plasma/plasmoids

# Assign meta to overview
kwriteconfig5 --file kwinrc --group ModifierOnlyShortcuts --key Meta "org.kde.kglobalaccel,/component/kwin,,invokeShortcut,Overview"
qdbus org.kde.KWin /KWin reconfigure
