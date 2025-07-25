#!/bin/bash
osascript <<EOF
tell application "System Events"
  tell (first process whose frontmost is true)
    set frontWin to front window
    set size of frontWin to {800, 600}
    set position of frontWin to {(item 1 of (screen of frontWin)'s size) / 2 - 400, (item 2 of (screen of frontWin)'s size) / 2 - 300}
  end tell
end tell
EOF
