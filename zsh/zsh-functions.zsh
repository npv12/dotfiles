#!/bin/sh

function extract () {
    if [ -f $1 ] ; then
        case $1 in
            *.tar.bz2)   tar xjf $1   ;;
            *.tar.gz)    tar xzf $1   ;;
            *.bz2)       bunzip2 $1   ;;
            *.rar)       unrar x $1     ;;
            *.gz)        gunzip $1    ;;
            *.tar)       tar xvvf $1    ;;
            *.tbz2)      tar xjf $1   ;;
            *.tgz)       tar xzf $1   ;;
            *.zip)       unzip $1     ;;
            *.Z)         uncompress $1;;
            *.7z)        7z x $1      ;;
            *)           echo "'$1' cannot be extracted via ex()" ;;
        esac
    else
        echo "'$1' is not a valid file"
    fi
}

# Git related
function del-multiple-branches() {
	git branch | grep "$1" | xargs git branch -D
}

function del-multiple-remotes() {
	git remote -v | grep "$1" | xargs git remote remove
}

# Quriate
function deploy-quriate() {
	cd ~/Coding/webdev/frontend
	git co $1
	git pull origin $1
	rm -rf package-lock.json
	npm install
	export NODE_OPTIONS="--max-old-space-size=8192"
	npm run build:$1
	firebase use $1
	firebase deploy
	rm -r ~/Coding/webdev/frontend/build
	export NODE_OPTIONS=""
}

function connect-quriate() {
	if [ $# -eq 0 ]
		then
		psql -d devdb -U postgres
	else
		PGPASSWORD=$1 psql -h 34.131.55.59 -U $1user -d $1db
	fi
}


# Sideload android
function rom-sideload() {
	adb reboot sideload-auto-reboot && adb wait-for-device-sideload && adb sideload $1 && rm $1
}

# YT Download
function download_yt() {
	yt-dlp -ciwx --audio-format mp3 --audio-quality 0 $1
}
