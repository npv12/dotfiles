#!/usr/bin/env bash

CONFIG_DIR="${CONFIG_DIR:-$HOME/.config/sketchybar}"
source "$CONFIG_DIR/colors.sh"

# Retrieve all workspaces
ALL_WORKSPACES=($(aerospace list-workspaces --all | sort -n))

# Retrieve non-empty workspaces
NON_EMPTY=($(aerospace list-workspaces --monitor all --empty no))

# Get the currently focused workspace
FOCUSED=$(aerospace list-workspaces --focused)

# Combine non-empty and focused workspaces
WORKSPACES_TO_SHOW=($(echo "${NON_EMPTY[@]}" "$FOCUSED" | tr ' ' '\n' | sort -n | uniq))

# Get existing workspace items in SketchyBar
EXISTING=($(sketchybar --query bar | jq -r '.items[] | select(startswith("space."))'))

# Extract workspace IDs from existing items
EXISTING_IDS=()
for item in "${EXISTING[@]}"; do
  EXISTING_IDS+=("${item#space.}")
done

# Compare current and desired workspace lists
if [ "${WORKSPACES_TO_SHOW[*]}" != "${EXISTING_IDS[*]}" ]; then
  # Remove all existing workspace items
  for item in "${EXISTING[@]}"; do
    sketchybar --remove "$item"
  done

  # Add workspace items in the correct order
  for sid in "${WORKSPACES_TO_SHOW[@]}"; do
    ITEM_NAME="space.$sid"
    if [[ "$sid" =~ ^[1-9]$ ]]; then
        DISPLAY=1
    else
        DISPLAY=2
    fi
    LABEL="${sid^^}"
    if [[ "$sid" == "$FOCUSED" ]]; then
        sketchybar --add item "$ITEM_NAME" left \
        --set "$ITEM_NAME" \
            associated_display=$DISPLAY \
            label=$LABEL \
            icon.drawing=off \
            padding_left=2 \
            padding_right=2 \
            background.color=0xFFFAB387 \
            label.color=0xFF11111B \
            background.corner_radius=5 \
            background.height=20 \
            click_script="aerospace workspace $sid" \
            script="$CONFIG_DIR/plugins/aerospace.sh $sid" \
        --subscribe "$ITEM_NAME" aerospace_workspace_change
    else
      sketchybar --add item "$ITEM_NAME" left \
      --set "$ITEM_NAME" \
            associated_display=$DISPLAY \
            label=$LABEL \
            icon.drawing=off \
            padding_left=2 \
            padding_right=2 \
            background.color=0xFF11111B \
            label.color=0xFFCDD6F4 \
            background.corner_radius=5 \
            background.height=20 \
            click_script="aerospace workspace $sid" \
            script="$CONFIG_DIR/plugins/aerospace.sh $sid" \
      --subscribe "$ITEM_NAME" aerospace_workspace_change
    fi
  done
fi
