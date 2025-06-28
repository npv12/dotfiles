yay -S bison # Deps
yay -S --mflags "--nocheck" rofi-lbonn-wayland
yay -S hyprland-nvidia swaylock grim slurp wf-recorder brightnessctl \
    pavucontrol waybar xdg-desktop-portal-hyprland-git mako swayidle
yay -Rns bison
ln -s ~/dotfiles/hypr ~/.config/hypr
ln -s ~/dotfiles/rofi ~/.config/rofi
ln -s ~/dotfiles/mako ~/.config/mako
ln -s ~/dotfiles/waybar ~/.config/waybar
ln -s ~/dotfiles/autostart ~/.config/autostart