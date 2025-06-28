#! /bin/zsh

function build_custom_ros() {
    mkdir -p ~/tempo
    cd ~/tempo
    git clone git@github.com:sagaciity/$1.git
    cd $1
    makepkg -si --noconfirm
    cd ~
    rm -rf ~/tempo
}

# paru -S ros-noetic-ros-base ros-noetic-rosserial-msgs ros-noetic-rosserial-python ros-noetic-rosserial-server \
#     ros-noetic-tf

build_custom_ros ros-noetic-rosserial-client
build_custom_ros ros-noetic-rosserial-arduino