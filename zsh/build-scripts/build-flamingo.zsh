# /usr/bin/zsh
function flamingo-setup() {
    echo "Setting up Flamingo"
    mkdir $HOME/flamingo
    cd $HOME/flamingo
    echo "Cloning Flamingo"
    repo init -u git@github.com:Flamingo-OS/manifest.git -b A13
    repo-sync
    echo "Setting up flamingo devices"
    source $HOME/flamingo/build/envsetup.sh
    roomservice -d "oneplus7pro"
    repo-sync # Again to fetch oneplus7pro repos
    echo "Cloning signing keys"
    git clone git@github.com:AOSP-Krypton/certs.git
}

function gapps() {
   nbuild "oneplus7pro" "user" -g -c "${@}"
}

function incremental() {
    nbuild "oneplus7pro" "user" -g -i oneplus7pro_incremental -c "${@}"
}

function nbuild() {
    tg "Starting build"
    launch "${@}"
    if [[ $? -eq 0 ]] ; then
        tg "Build done"
        if [ -z "$out" ] ; then
            out="$OUT"
        fi
        for file in "$out"/F*.zip ;do
            file_name=`echo $file | awk  -F'\/' '{print $(NF)}'`
            tg "Uploading $file_name"
            if rcp $file drive: ; then
                link=$(rclone link drive:${file_name})
            echo $link
                tg "Upload done. It has been uploaded to: ${link}"
            else
                tg "Upload failed"
            fi
        done
    elif [ -f out/error.log ] ; then
            tg -f out/error.log
    fi
}

function flamingo-create-release() {
    tg "Starting releases"
    local file_name="*"
    local today_date=$(date "+%d/%m/%Y")
    local devices=("oneplus7pro" "oneplus7tpro" "oneplus7t" "alioth")

    cd ~/flamingo
    local device_codename=
    for device_codename in ${devices[@]}; do
        cd ~/flamingo
        
        tg "Fetching incrementals"
        rm -rf ${device_codename}_release_incremental
        rcp "kosp:Incremental/release/${device_codename}/" ${device_codename}_release_incremental

        # Fetch device repos
        tg "Fetching device specific repos"
        rm .repo/local_manifests/*.xml
        roomservice -d $device_codename
        repo-sync
        nbuild $device_codename "user"  -cgf -i ${device_codename}_release_incremental -o $device_codename --build-both-targets

        # Backing up incremental
        tg "Backing up incremental for $device_codename"
        cd ~/flamingo/${device_codename}_release_incremental
        rclone purge kosp:Incremental/release/${device_codename}/
        rcp . "kosp:Incremental/release/${device_codename}"

        tg "Done with $device_codename"
    done
}
