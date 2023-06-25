paru -S bison # Deps
paru -S hyprland-nvidia gtklock rofi-lbonn-wayland playerctl grim slurp wf-recorder brightnessctl \
    pavucontrol wl-clipboard socat jq waybar blueberry alacritty polkit-gnome swayosd \
    wl-clipboard wl-clipboard-history-git xdg-desktop-portal-hyprland-git dunst
paru -Rns bison
ln -s ~/dotfiles/hypr ~/.config/hypr
ln -s ~/dotfiles/rofi ~/.config/rofi
ln -s ~/dotfiles/dunst ~/.config/dunst
ln -s ~/dotfiles/waybar ~/.config/waybar