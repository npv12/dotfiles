#!/usr/bin/env bash
DISPLAYS=($(yabai -m query --displays | jq -r '.[].index'))
BAR_ITEMS=($(sketchybar --query bar | jq -r '.items[]'))

for DISP in "${DISPLAYS[@]}"; do
  SPACES=($(yabai -m query --spaces --display "$DISP" | jq -r '.[].index'))
  NON_EMPTY=($(yabai -m query --spaces --display "$DISP" | jq -r '.[] | select(."first-window" != 0) | .index'))
  FOCUSED=$(yabai -m query --spaces --display "$DISP" | jq -r '.[] | select(."has-focus"==true) | .index')
  SHOW=($(printf "%s\n" "${NON_EMPTY[@]}" "$FOCUSED" | sort -n | uniq))

  EXISTING=()
  for item in "${BAR_ITEMS[@]}"; do
    [[ $item == space.$DISP.* ]] && EXISTING+=("$item")
  done

  EXISTING_IDS=()
  for item in "${EXISTING[@]}"; do
    EXISTING_IDS+=("${item##*.}")
  done

  if [ "${SHOW[*]}" != "${EXISTING_IDS[*]}" ]; then
    for it in "${EXISTING[@]}"; do
      sketchybar --remove "$it"
    done
    for sid in "${SHOW[@]}"; do
      ITEM="space.$DISP.$sid"
      BG="0xFF11111B"; FG="0xFFCDD6F4"
      if [ "$sid" -eq "$FOCUSED" ]; then
        BG="0xFFFAB387"; FG="0xFF11111B"
      fi

      sketchybar --add item "$ITEM" left \
        --set "$ITEM" \
          associated_display=$DISP \
          label="$sid" \
          icon.drawing=off \
          padding_left=2 \
          padding_right=2 \
          background.color="$BG" \
          label.color="$FG" \
          background.corner_radius=5 \
          background.height=20 \
          click_script="yabai -m space --focus $sid" \
          script="$CONFIG_DIR/plugins/yabai_space.sh $ITEM $sid" \
        --subscribe "$ITEM" space_change display_change
    done
  fi
done
