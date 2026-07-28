#!/usr/bin/env zsh
#
# FZF UI for Zsh4Humans v5 + Homebrew FZF 0.74+
#
# Source this file after `z4h init`.
#
# Zsh4Humans keeps ownership of completion/history behavior, adaptive height,
# screen restoration, insertion and multi-select. This module only:
#   1. decorates candidates with an icon,
#   2. changes the candidate field separator to ASCII Unit Separator,
#   3. makes fzf search only the actual candidate text,
#   4. returns only the original raw value with --accept-nth=1.
#
# No Zsh4Humans function is copied or replaced.

[[ -o interactive ]] || return 0
(( $+commands[fzf] )) || return 0

# NUL cannot be passed inside argv. Z4H uses NUL inside its input records, so
# this wrapper parses those records and rewrites them with Unit Separator (US).
# US is safe in argv and exceptionally unlikely to occur in filenames/history.
typeset -gr _FZF_UI_FIELD_SEP=$'\x1f'

typeset -gr _FZF_UI_ICON_COLOR=$'\e[38;2;166;227;161m'
typeset -gr _FZF_UI_RESET=$'\e[0m'
typeset -g  _fzf_ui_icon='󰒕'

function _fzf_ui_set_icon() {
  _fzf_ui_icon=$1
}

function _fzf_ui_classify_path() {
  emulate -L zsh

  local path=$1

  if [[ -L $path ]]; then
    _fzf_ui_set_icon ''
  elif [[ -d $path ]]; then
    _fzf_ui_set_icon '󰉋'
  elif [[ -S $path ]]; then
    _fzf_ui_set_icon '󰆨'
  elif [[ -p $path ]]; then
    _fzf_ui_set_icon '󰟥'
  elif [[ -b $path ]]; then
    _fzf_ui_set_icon '󰋊'
  elif [[ -c $path ]]; then
    _fzf_ui_set_icon '󰆍'
  elif [[ -x $path ]]; then
    _fzf_ui_set_icon ''
  else
    _fzf_ui_set_icon '󰈔'
  fi
}

function _fzf_ui_classify_completion() {
  emulate -L zsh

  _fzf_ui_set_icon '󰒕'

  [[ $1 == <-> ]] || return 0

  local -i idx=$1
  local word=${_z4h_words[idx]-}
  local display=${_z4h_descrs[idx]-}
  local display_l=${display:l}
  local context_l=${_z4h_curcontext:l}
  local command_name=${words[1]:-}
  local lookup=${(Q)word}
  local kind=''

  command_name=${${(Q)command_name}:t}

  # Some path candidates travel through generic completion.
  if [[ -n $lookup && ( -e $lookup || -L $lookup ) ]]; then
    _fzf_ui_classify_path "$lookup"
    return 0
  fi

  # Options should never be passed to `whence`.
  if [[ $word == -* ]]; then
    _fzf_ui_set_icon '󰘳'
    return 0
  fi

  # `whence -w` safely handles command names such as ".14" and
  # ".14-config". Avoid associative-array subscripts here because Zsh can
  # parse punctuation-heavy keys as arithmetic expressions.
  if [[ -n $lookup ]]; then
    kind=$(builtin whence -w -- "$lookup" 2>/dev/null)
    kind=${kind##*: }

    case $kind in
      (alias)
        _fzf_ui_set_icon '󰌷'
        return 0
        ;;
      (function)
        _fzf_ui_set_icon '󰊕'
        return 0
        ;;
      (builtin)
        _fzf_ui_set_icon '󰀫'
        return 0
        ;;
      (reserved)
        _fzf_ui_set_icon '󰘳'
        return 0
        ;;
      (command)
        _fzf_ui_set_icon '󰆍'
        return 0
        ;;
    esac
  fi

  # Context-based categories that are not command names.
  case "$display_l $context_l" in
    (*alias*)
      _fzf_ui_set_icon '󰌷'
      ;;
    (*builtin*)
      _fzf_ui_set_icon '󰀫'
      ;;
    (*function*)
      _fzf_ui_set_icon '󰊕'
      ;;
    (*host*)
      _fzf_ui_set_icon '󰒍'
      ;;
    (*user*)
      _fzf_ui_set_icon '󰀂'
      ;;
    (*parameter*|*environment*|*variable*)
      _fzf_ui_set_icon '󰪶'
      ;;
    (*option*)
      _fzf_ui_set_icon '󰘳'
      ;;
    (*branch*)
      _fzf_ui_set_icon ''
      ;;
    (*remote*)
      _fzf_ui_set_icon '󰓅'
      ;;
    (*process*|*pid*)
      _fzf_ui_set_icon '󰐊'
      ;;
    (*job*)
      _fzf_ui_set_icon '󰜎'
      ;;
    (*)
      case $command_name in
        (export|unset|typeset|readonly|local)
          _fzf_ui_set_icon '󰪶'
          ;;
        (ssh|scp|sftp|rsync|rdp)
          _fzf_ui_set_icon '󰒍'
          ;;
      esac
      ;;
  esac
}

# Z4H line-oriented candidate format:
#
#   raw-value NUL display-text NEWLINE
#
# We deliberately read the raw value with `read -d NUL` rather than storing a
# NUL-containing line in a shell variable. Output sent to fzf:
#
#   raw-value US colored-icon US display-text NEWLINE
function _fzf_ui_enrich_lines() {
  emulate -L zsh

  local mode=$1
  local raw display effective_mode

  while IFS= read -r -d $'\0' raw; do
    if ! IFS= read -r display; then
      display=''
    fi

    effective_mode=$mode

    if [[ $effective_mode == auto ]]; then
      if [[ $raw == <-> ]] && (( raw >= 1 && raw <= ${#_z4h_words} )); then
        effective_mode=completion
      else
        effective_mode=path
      fi
    fi

    if [[ $effective_mode == completion ]]; then
      if [[ $raw == <-> ]] &&
         (( raw >= 1 && raw <= ${#_z4h_words} )); then
        _fzf_ui_classify_completion "$raw"
      else
        _fzf_ui_set_icon '󰒕'
      fi
    elif [[ $effective_mode == recursive-path ]]; then
      # Avoid stat calls for potentially thousands of recursive candidates.
      _fzf_ui_set_icon '󰈔'
    else
      _fzf_ui_classify_path "$raw"
    fi

    printf '%s%s%s%s%s  %s%s%s\n' \
      "$raw" "$_FZF_UI_FIELD_SEP" \
      "$_FZF_UI_ICON_COLOR" "$_fzf_ui_icon" "$_FZF_UI_RESET" \
      "$_FZF_UI_FIELD_SEP" "$display"
  done
}

# History records are already NUL-delimited because Z4H passes --read0.
# Keep the complete original history record as field 1. This preserves Z4H's
# own metadata stripping and multiline-history behavior after selection.
function _fzf_ui_enrich_history() {
  emulate -L zsh

  local entry

  while IFS= read -r -d $'\0' entry; do
    printf '%s%s%s󰋚%s  %s%s\0' \
      "$entry" "$_FZF_UI_FIELD_SEP" \
      "$_FZF_UI_ICON_COLOR" "$_FZF_UI_RESET" \
      "$_FZF_UI_FIELD_SEP" "$entry"
  done
}

function _fzf_ui_enrich_recursive_paths() {
  emulate -L zsh

  local replacement="${_FZF_UI_FIELD_SEP}"
  replacement+="${_FZF_UI_ICON_COLOR}󰈔${_FZF_UI_RESET}  "
  replacement+="${_FZF_UI_FIELD_SEP}"

  FZF_UI_REPLACEMENT="$replacement" \
    command perl -pe \
      's/\x00/$ENV{FZF_UI_REPLACEMENT}/'
}

# Z4H invokes this through its per-widget fzf-command style.
function _fzf_ui_fzf() {
  emulate -L zsh

  local widget=${WIDGET#z4h-}
  local mode=passthrough
  local stack=" ${(j: :)funcstack} "

  case $widget in
    (fzf-history)
      mode=history
      ;;
    (fzf-dir-history|cd-down)
      mode=path
      ;;
    (fzf-complete)
      if [[ $stack == *' -z4h-comp-files '* ]]; then
        if zstyle -T ':z4h:fzf-complete' recurse-dirs; then
            mode=recursive-path
        else
            mode=path
        fi
      elif [[ $stack == *' -z4h-comp-words '* ]]; then
        mode=completion
      else
        mode=auto
      fi
      ;;
  esac

  case $mode in
    (path|recursive-path)
    local selected

    if [[ $mode == recursive-path ]]; then
        selected="$(
        _fzf_ui_enrich_recursive_paths |
            command fzf "$@"
        )" || return
    else
        selected="$(
        _fzf_ui_enrich_lines "$mode" |
            command fzf "$@"
        )" || return
    fi

    [[ -n $selected ]] || return

    # Restore the native Z4H file-record shape: raw_path NUL display.
    # Z4H only needs the raw path, so an empty display field is sufficient.
    local item
    for item in "${(@f)selected}"; do
        printf '%s\0\n' "$item"
    done
    ;;

    (completion|auto)
    _fzf_ui_enrich_lines "$mode" | command fzf "$@"
    ;;
    (history)
    _fzf_ui_enrich_history | command fzf "$@"
    ;;
    (*)
    command fzf "$@"
    ;;
  esac
}

# Z4H computes --height and --layout dynamically. Do not set either here.
typeset -ga _fzf_ui_base_flags=(
  --no-border
  --list-border=rounded
  --list-label-pos=2
  --highlight-line
  --info=hidden
  --margin=0
  --padding=0,1
  --pointer=' '
  --marker='󰄲 '
  --ellipsis='…'
  --tabstop=4
  '--bind=result:transform-list-label:printf " %s/%s " "$FZF_MATCH_COUNT" "$FZF_TOTAL_COUNT"'
  '--color=bg:#1e1e2e,bg+:#45475a,fg:#cdd6f4,fg+:#cdd6f4'
  '--color=hl:#af5fff,hl+:#f38ba8,prompt:#cba6f7,info:#cba6f7'
  '--color=pointer:#a6e3a1,marker:#a6e3a1,list-border:#cba6f7,list-label:#cba6f7'
)

# Search field 3 only. Field 2 is the icon and can never affect matching.
# Return field 1 only so all original Z4H consumers receive their native value.
typeset -ga _fzf_ui_field_flags=(
  "--delimiter=$_FZF_UI_FIELD_SEP"
  --with-nth=2,3
  --nth=2
  --accept-nth=1
  --ansi
)

# Visual fallback for other Z4H FZF widgets.
zstyle ':z4h:*' fzf-flags "${_fzf_ui_base_flags[@]}"

# Tab completion.
zstyle ':z4h:fzf-complete' fzf-flags \
  "${_fzf_ui_base_flags[@]}" \
  "${_fzf_ui_field_flags[@]}"
zstyle ':z4h:fzf-complete' fzf-command _fzf_ui_fzf
zstyle ':z4h:fzf-complete' fzf-bindings \
  'tab:toggle+down' \
  'btab:toggle+up'

# Ctrl-R history. Disable the extra bat preview to match Tab completion.
zstyle ':z4h:fzf-history' fzf-flags \
  "${_fzf_ui_base_flags[@]}" \
  "${_fzf_ui_field_flags[@]}"
zstyle ':z4h:fzf-history' fzf-command _fzf_ui_fzf
zstyle ':z4h:fzf-history' fzf-preview no

# Directory history and cd-down both consume path records.
for _fzf_ui_context in ':z4h:fzf-dir-history' ':z4h:cd-down'; do
  zstyle "$_fzf_ui_context" fzf-flags \
    "${_fzf_ui_base_flags[@]}" \
    "${_fzf_ui_field_flags[@]}"
  zstyle "$_fzf_ui_context" fzf-command _fzf_ui_fzf
done
unset _fzf_ui_context
