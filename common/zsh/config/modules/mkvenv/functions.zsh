#!/usr/bin/env zsh

# Python / mise — extend mise.toml via `mise config set` (https://mise.jdx.dev/cli/config/set.html).
# Loaded by modules/load.zsh. Skips defining mkvenv if an executable mkvenv is already on PATH.

if ! command -v mkvenv &>/dev/null; then

    function _mkvenv_project_name() {
        local proj="${PWD:t:l}"
        proj="${proj//[^a-z0-9_-]/-}"
        proj="${proj##-}"
        proj="${proj%%-}"
        [[ -z "$proj" ]] && proj=app
        print -r -- "$proj"
    }

    # Runs in mkvenv's shell so `read` uses the real TTY (not a $(...) subshell).
    # Argument must be the literal name `workflow` (whitelist avoids unsafe eval).
    function _mkvenv_read_workflow_into() {
        [[ "$1" == workflow ]] || {
            echo "mkvenv: internal error: bad workflow ref" >&2
            return 1
        }
        echo "mkvenv: dependency workflow:" >&2
        echo "  [p] pyproject.toml + uv.lock (editable package; src/<name>/ for hatchling)" >&2
        echo "  [r] requirements.in + requirements.txt (default)" >&2
        read -k 1 "?Choice [p/r] (default r): "
        echo >&2
        case "$REPLY" in
            p | P) eval "${1}=pyproject" ;;
            *) eval "${1}=requirements" ;;
        esac
    }

    function _mkvenv_ensure_mise_toml() {
        local mf="${1:-mise.toml}"
        if [[ ! -f "$mf" ]]; then
            echo "mkvenv: $mf missing in $(pwd); creating an empty file (fill tools or run mise init)." >&2
            touch "$mf" || return 1
        fi
    }

    function _mkvenv_write_pyproject_layout() {
        local proj="$1"
        local pf=pyproject.toml
        local write_pf=false
        local pf_msg=

        if [[ ! -f "$pf" ]]; then
            write_pf=true
            pf_msg=created
        else
            read -q "?pyproject.toml exists. Overwrite (+ src/$proj/)? [y/N] " || true
            echo
            if [[ "$REPLY" == y ]]; then
                write_pf=true
                pf_msg=overwrote
            fi
        fi

        if [[ "$write_pf" != true ]]; then
            if [[ ! -d "src/$proj" ]]; then
                echo "mkvenv: hatchling expects a package at src/$proj/ — add it or set [tool.hatch.build.targets.wheel]." >&2
            fi
            return 0
        fi

        mkdir -p "src/$proj"
        [[ -f "src/$proj/__init__.py" ]] || : >"src/$proj/__init__.py"

        cat <<EOF >"$pf"
[project]
name = "$proj"
version = "0.1.0"
requires-python = ">=3.14"
dependencies = []

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/$proj"]
EOF
        echo "mkvenv: $pf_msg $pf and src/$proj/ (hatchling wheel packages)."
    }

    function _mkvenv_write_requirements_layout() {
        local ri=requirements.in
        local rt=requirements.txt
        local write_ri=false

        if [[ ! -f "$ri" ]]; then
            write_ri=true
        else
            read -q "?requirements.in exists. Overwrite with a starter file? [y/N] " || true
            echo
            [[ "$REPLY" == y ]] && write_ri=true
        fi

        if [[ "$write_ri" == true ]]; then
            cat <<'EOF' >"$ri"
# Direct dependencies — edit then run: mise run update
EOF
            echo "mkvenv: wrote $ri"
        fi

        if [[ ! -f "$rt" ]]; then
            if command -v uv &>/dev/null && uv pip compile "$ri" -o "$rt" 2>/dev/null; then
                echo "mkvenv: generated $rt via uv pip compile"
            else
                print -r -- "# Run: uv pip compile requirements.in -o requirements.txt" >"$rt"
                echo "mkvenv: stub $rt (run uv pip compile when uv is available)"
            fi
        fi

        if [[ -f pyproject.toml ]]; then
            echo "mkvenv: note: pyproject.toml is still present; remove it or pick [p] next time if you hit editable-install conflicts." >&2
        fi
    }

    function _mkvenv_mise_core() {
        local mf="$1"
        mise config set -f "$mf" -y tools.python 3.14 || return 1
        mise config set -f "$mf" -y tools.uv latest || return 1
        mise config set -f "$mf" -y 'env._.python.venv.path' .venv || return 1
        mise config set -f "$mf" -y 'env._.python.venv.create' true || return 1
        mise config set -f "$mf" -y tasks.install-uv.run 'mise install uv@latest' || return 1
        mise config set -f "$mf" -y settings.python.uv_venv_auto true || return 1
        mise config set -f "$mf" -y settings.python.uv_venv_create_args --type list -- '--seed' || return 1
    }

    function _mkvenv_mise_tasks_pyproject() {
        local mf="$1"
        mise config set -f "$mf" -y tasks.check.description 'Validate environment consistency (uv.lock)' || return 1
        mise config set -f "$mf" -y tasks.check.run 'uv pip check && uv sync --all-extras --frozen --dry-run' || return 1
        mise config set -f "$mf" -y tasks.update.description 'Update dependencies while maintaining constraints' || return 1
        mise config set -f "$mf" -y tasks.update.run --type list 'uv lock,uv sync --all-extras --frozen' || return 1
        mise config set -f "$mf" -y tasks.install.description 'Install dependencies (non-destructive)' || return 1
        mise config set -f "$mf" -y tasks.install.run 'uv sync --all-extras --no-remove --frozen' || return 1
        mise config set -f "$mf" -y tasks.sync.description 'Synchronize environment with uv.lock' || return 1
        mise config set -f "$mf" -y tasks.sync.run 'uv sync --all-extras --frozen' || return 1
    }

    function _mkvenv_mise_tasks_requirements() {
        local mf="$1"
        mise config set -f "$mf" -y tasks.check.description 'Validate environment consistency (requirements.txt)' || return 1
        mise config set -f "$mf" -y tasks.check.run 'uv pip check && uv pip freeze | diff - requirements.txt' || return 1
        mise config set -f "$mf" -y tasks.update.description 'Compile requirements.in and sync the venv' || return 1
        mise config set -f "$mf" -y tasks.update.run --type list 'uv pip compile requirements.in -o requirements.txt,uv pip sync requirements.txt' || return 1
        mise config set -f "$mf" -y tasks.install.description 'Install from requirements.txt (non-upgrading)' || return 1
        mise config set -f "$mf" -y tasks.install.run 'uv pip install -r requirements.txt' || return 1
        mise config set -f "$mf" -y tasks.sync.description 'Synchronize venv with requirements.txt' || return 1
        mise config set -f "$mf" -y tasks.sync.run 'uv pip sync requirements.txt' || return 1
    }

    function mkvenv() {
        if ! command -v mise &>/dev/null; then
            echo "mkvenv: mise is not on PATH." >&2
            return 1
        fi

        local mf=mise.toml
        _mkvenv_ensure_mise_toml "$mf" || return 1

        local proj workflow
        proj=$(_mkvenv_project_name)
        _mkvenv_read_workflow_into workflow

        case "$workflow" in
            pyproject)
                _mkvenv_write_pyproject_layout "$proj" || return 1
                ;;
            requirements)
                _mkvenv_write_requirements_layout || return 1
                ;;
        esac

        _mkvenv_mise_core "$mf" || return 1
        case "$workflow" in
            pyproject) _mkvenv_mise_tasks_pyproject "$mf" || return 1 ;;
            requirements) _mkvenv_mise_tasks_requirements "$mf" || return 1 ;;
        esac

        echo "mkvenv: updated $mf (workflow: $workflow)."
        load-mise
    }
fi
