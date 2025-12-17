_just_completion() {
    if [[ -f "justfile" ]]; then
      local options
      options="$(just --summary)"
      reply=(${(s: :)options})  # turn into array and write to return variable
    fi
}

compctl -K _just_completion just