paru -S hyprland-nvidia rofi-lbonn-wayland hyprpaper-git wl-clipboard wl-clipboard-history-git xdg-desktop-portal-hyprland-git avizo
paru -S swayidle swaylock-effects grim slurp wf-recorder eww-wayland

ln -s ~/dotfiles/hypr ~/.config/hypr
ln -s ~/dotfiles/rofi ~/.config/rofi

paru -S swayidle swaylock-effects grim slurp wf-recorder foot dunst hyprland-nvidia eww-wayland ttf-segoe-ui-variable waybar \
    bc blueberry dunst gojq light networkmanagerapplet plasma-browser-integration playerctl socat udev \
    wlogout wofi libqalculate sox nlohmann-json boost-libs \
    rofi-lbonn-wayland hyprpaper-git wl-clipboard wl-clipboard-history-git xdg-desktop-portal-hyprland-git bison

paru -S eww-wayland hyprland-nvidia gtklock hyprpicker rofi-lbonn-wayland playerctl grim slurp wf-recorder \
    brightnessctl pavucontrol wl-gammactl wl-clipboard socat jq waybar blueberry kitty polkit-gnome