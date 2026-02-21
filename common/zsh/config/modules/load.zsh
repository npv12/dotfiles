#!/bin/zsh

export ZSH_MODULES_DIR="$ZSH_DIR/modules"

for module in "$ZSH_MODULES_DIR"/*; do
    if [[ -d "$module" ]]; then
        for file in alias functions; do
            if [[ -f "$module/${file}.zsh" ]]; then
                source "$module/${file}.zsh"
            fi
        done
    fi
done
