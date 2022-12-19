export USE_CCACHE=1
export CCACHE_EXEC="/usr/bin/ccache"
ccache -M 200G
ccache -o compression=false
alias rcp="rclone copy --progress"
alias tg="telegram-send --config ~/PranavTg.conf"
alias repo-sync="repo sync -c --force-sync --optimized-fetch --no-tags --no-clone-bundle --prune -j$(nproc --all)"

zsh_add_file "build-scripts/build-flamingo"
zsh_add_file "build-scripts/clang-toolchain"
zsh_add_file "build-scripts/build-kernel"
cd ~/flamingo
eval `ssh-agent -s`
ssh-add ~/.ssh/id_gitsps
source build/envsetup.sh
