ICON_COLOR=0xFFFEFEFE

case $INFO in
  "Zed Preview")
    ICON_PADDING_RIGHT=2
    ICON_COLOR=0xffcba6f7
    ICON=󰨞
    ;;
  "Discord")
    ICON_COLOR=0xff5b5bf5
    ICON=󰙯
    ;;
  "Finder")
    ICON_COLOR=0xFFFEFEFE
    ICON=󰉋
    ;;
  "Messages")
    ICON=󰍦
    ;;
  "Notion")
    ICON_COLOR=0xffe0e0e0
    ICON=󰬕
    ;;
  "Preview")
    ICON_COLOR=0xff137DF8
    ICON=
    ;;
  "Spotify")
    ICON_COLOR=0xff24D44E
    ICON=
    ;;
  "Alacritty")
    ICON_COLOR=0xffb4befe
    ICON=
    ;;
  "Google Chrome")
    ICON_COLOR=0xffa6e3a1
    ICON=
    ;;
  "GitHub Desktop")
    ICON_COLOR=0xFF9761c9
    ICON=
    ;;
  *)
    ICON_COLOR=0xFFFEFEFE
    ICON=﯂
    ;;
esac

sketchybar --set $NAME \
  icon=$ICON icon.color=$ICON_COLOR \
  label="$INFO"
