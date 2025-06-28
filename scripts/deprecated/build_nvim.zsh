#!/usr/bin/env zsh

sudo apt remove neovim
sudo apt install ninja-build gettext cmake
git clone https://github.com/neovim/neovim
cd neovim
make CMAKE_BUILD_TYPE=RelWithDebInfo
ls
cd build
cpack -G DEB
sudo dpkg -i --force-overwrite  nvim-linux64.deb
sudo apt autoremove ninja-build gettext cmake