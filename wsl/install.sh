#!/usr/bin/env zsh

sudo apt-get install -y apt-transport-https ca-certificates curl gpg
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.33/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.33/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt update
sudo apt install -y kubelet kubectl
sudo apt install kubectx

sudo apt install -y bat git micro tmux zsh
sudo apt install -y ripgrep fd-find

# Bottom
BOTTOM_RELEASE_VERSION=0.10.2
BOTTOM_RELEASE_FILE="bottom_${BOTTOM_RELEASE_VERSION}-1_amd64.deb"
curl -LO https://github.com/ClementTsang/bottom/releases/download/${BOTTOM_RELEASE_VERSION}/${BOTTOM_RELEASE_FILE}
sudo dpkg -i ${BOTTOM_RELEASE_FILE}
rm ${BOTTOM_RELEASE_FILE}

# Git delta
DELTA_RELEASE_VERSION=0.18.2
DELTA_RELEASE_FILE="git-delta_${DELTA_RELEASE_VERSION}_amd64.deb"
curl -LO https://github.com/dandavison/delta/releases/download/${DELTA_RELEASE_VERSION}/${DELTA_RELEASE_FILE}
sudo dpkg -i ${DELTA_RELEASE_FILE}
rm ${DELTA_RELEASE_FILE}
