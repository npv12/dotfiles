# Loop through all displays
DISPLAYS=($(yabai -m query --displays | jq -r '.[].index'))

for DISP in "${DISPLAYS[@]}"; do
  # Spaces on this display
  SPACES=($(yabai -m query --spaces --display "$DISP" | jq -r '.[].index'))

  # Non-empty spaces on it
  NON_EMPTY=($(yabai -m query --spaces --display "$DISP" | jq -r '.[] | select(."first-window" != 0) | .index'))

  # Focused space for this display
  FOCUSED=$(yabai -m query --spaces --display "$DISP" | jq -r '.[] | select(."has-focus"==true) | .index')

  SHOW=($(printf "%s\n" "${NON_EMPTY[@]}" "$FOCUSED" | sort -n | uniq))

  # Existing items for this display
  EXISTING=($(sketchybar --query bar | jq -r '.items[] | select(startswith("space."))'))

  # Extract workspace IDs from existing items
  EXISTING_IDS=()
  for item in "${EXISTING[@]}"; do
    EXISTING_IDS+=("${item#space..}")
  done

  echo "Display $DISP: Non-empty spaces: ${NON_EMPTY[*]}, Focused space: $FOCUSED, Spaces to show: ${SHOW[*]}, Existing items: ${EXISTING_IDS[*]}, Existing items: ${EXISTING[*]}"

  if [ "${SHOW[*]}" != "${EXISTING_IDS[*]}" ]; then
    for item in "${EXISTING[@]}"; do
      sketchybar --remove "$item"
    done

    for sid in "${SHOW[@]}"; do
      ITEM="space.$PREFIX.$sid"
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
          script="$CONFIG_DIR/plugins/aerospace.sh $sid" \
        --subscribe "$ITEM" space_change
    done
  fi
done
