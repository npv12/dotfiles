#!/bin/zsh

ZSH_MODULES_DIR="${0:A:h}"

# Configuration via environment variables:
#   ZSH_MODULES_LOAD_ALL=1    - Load all modules (default if no whitelist)
#   ZSH_MODULES_WHITELIST     - Array of modules to load (if set, overrides LOAD_ALL)
#   ZSH_MODULES_BLACKLIST     - Array of modules to skip

typeset -a ZSH_MODULES_WHITELIST
typeset -a ZSH_MODULES_BLACKLIST

# Resolve module order based on dependencies
_zsh_modules_resolve_order() {
    local -a modules=()
    local -A deps=()
    local -A visited=()
    local -A resolved=()

    # Gather modules and their dependencies
    for module_path in "$ZSH_MODULES_DIR"/*(N/); do
        local module_name="${module_path:t}"

        # Skip hidden directories and validate it's a proper directory
        [[ "$module_name" == .* ]] && continue
        [[ ! -d "$module_path" ]] && continue

        modules+=("$module_name")

        if [[ -f "$module_path/depends" ]]; then
            deps[$module_name]=$(tr '\n' ' ' < "$module_path/depends" | xargs)

            # Validate dependencies exist
            for dep in ${(s: :)deps[$module_name]}; do
                [[ -n "$dep" && ! -d "$ZSH_MODULES_DIR/$dep" ]] && {
                    echo "Warning: Module '$module_name' depends on non-existent module '$dep'" >&2
                }
            done
        else
            deps[$module_name]=""
        fi
    done

    # Topological sort using DFS
    local -a result=()

    _resolve_deps() {
        local module="$1"

        if [[ -n "${resolved[$module]}" ]]; then
            return 0
        fi

        if [[ -n "${visited[$module]}" ]]; then
            echo "Error: Circular dependency detected involving $module" >&2
            return 1
        fi

        visited[$module]=1

        for dep in ${(s: :)deps[$module]}; do
            if [[ -n "$dep" ]]; then
                _resolve_deps "$dep" || return $?
            fi
        done

        resolved[$module]=1
        result+=("$module")
    }

    for module in "${modules[@]}"; do
        _resolve_deps "$module" || return $?
    done

    printf '%s\n' "${result[@]}"
}

# Check if module should be loaded
_zsh_modules_should_load() {
    local module="$1"

    # Check blacklist
    for skip in "${ZSH_MODULES_BLACKLIST[@]}"; do
        if [[ "$module" == "$skip" ]]; then
            return 1
        fi
    done

    # If whitelist is set, only load whitelisted modules
    if [[ ${#ZSH_MODULES_WHITELIST[@]} -gt 0 ]]; then
        for allow in "${ZSH_MODULES_WHITELIST[@]}"; do
            if [[ "$module" == "$allow" ]]; then
                return 0
            fi
        done
        return 1
    fi

    # Default: load all (unless blacklisted)
    return 0
}

# Load module files
_zsh_modules_load_module() {
    local module="$1"
    local module_path="$ZSH_MODULES_DIR/$module"

    for file in alias functions hooks config; do
        if [[ -f "$module_path/${file}.zsh" ]]; then
            source "$module_path/${file}.zsh"
        fi
    done
}

# Main loader
_zsh_modules_load() {
    local -a module_order
    module_order=($(_zsh_modules_resolve_order))

    for module in "${module_order[@]}"; do
        if _zsh_modules_should_load "$module"; then
            _zsh_modules_load_module "$module"
        fi
    done
}

_zsh_modules_load

# Cleanup internal functions
unfunction _zsh_modules_resolve_order _zsh_modules_should_load _zsh_modules_load_module _zsh_modules_load
