function basic() {
    echo "Setting basic stuffs up"
    echo "Adding keys to your shell and bashrc"
    eval "$(ssh-agent -s)"
    ssh-add ~/.ssh/id_gitsps
    echo "eval `ssh-agent -s`" >> ~/.bashrc
    echo "ssh-add ~/.ssh/id_gitsps" >> ~/.bashrc
    echo "Adding the main file to source"
    echo "source ~/setup.sh" >> ~/.bashrc
    mkdir -p ~/.config/rclone
    mv ~/rclone.conf ~/.config/rclone/
    echo "Done"
}

function kotlinSupport() {
    echo "Adding kotlin script support"
    local current_dir=$(pwd)
    cd
    curl -L -O https://github.com/JetBrains/kotlin/releases/download/v1.6.10/kotlin-compiler-1.6.10.zip
    unzip kotlin-compiler*
    cd $current_dir
    echo "Done"
}

function repoSync() {
    repo sync -c --force-sync --optimized-fetch --no-tags --no-clone-bundle --prune -j$(nproc --all)
}

function kospSetup() {
    echo "Setting up kosp"
    mkdir $HOME/kosp
    cd $HOME/kosp
    echo "Cloning kosp"
    repo init -u git@github.com:AOSP-Krypton/manifest.git -b A12
    repoSync

    echo "Setting up kosp devices"
    source $HOME/kosp/build/envsetup.sh

    local devices=("guacamole" "hotdogb" "hotdog")
    local device_codename=
    for device_codename in ${devices[@]}; do
        fetchrepos $device_codename
    done

    echo "Cloning signing keys"
    git clone git@github.com:AOSP-Krypton/certs.git

    echo "Retrieving incremental updates"
    retrieveIncremental
    retrieveReleaseIncremental

    cd
    echo "Cloneing OTA repo"
    git clone git@github.com:AOSP-Krypton/ota.git

    echo "Setting permission"
    chmod 777 $HOME/kosp
    echo "DONE"
}

function kospSync() {
    repoSync
    cd vendor/themes
    git remote add me git@github.com:npv12/vendor_themes.git
    git pull me A12
    cd ~/kosp/fra*/base
    git pull krypton-ssh A12-vol-panel
    cd ~/kosp
}

function kospReleaseSync() {
    repoSync
    cd ~/kosp/vendor/google/gms
    git fetch krypton-gitlab A12-no-vanced
    git cp ccc9dcb011b9a6b0ddd210ac52b8b7455cf60344
    cd ~/kosp
}

function kospUpload() {
    # constants
    local folder="kosp"
    local file_name="*"
    local today_date=$(date "+%d/%m/%Y")
    local devices=("guacamole" "hotdogb" "hotdog")

    local device_codename=
    for device_codename in ${devices[@]}; do
        cd $HOME/$folder/$device_codename
        echo "Uploading ${device_codename}."

        # Gdrive
        rclone --progress copy . --include "${file_name}" "kosp:Release builds/A12/${device_codename}/"

        # Sourceforge
        scp -i $HOME/.ssh/id_ed25519 ${file_name} npv12@frs.sourceforge.net:/home/frs/project/kosp/A12/${device_codename}

        # pushing OTA
        echo "Pushing OTA for ${device_codename} now"
        cd $HOME/ota/$device_codename
        cp $HOME/changelog* $HOME/ota/${device_codename}
        cp $HOME/${folder}/ota/${device_codename}/ota.json $HOME/ota/${device_codename}
        git pull
        git add *
        git cm -m "${device_codename}: ${today_date} update"
        git push

        # Backing up incremental
        cd ~/kosp/${device_codename}_release_incremental
        rclone purge kosp:Incremental/release/${device_codename}/
        rclone --progress copy . "kosp:Incremental/release/${device_codename}"
        cd ~/kosp
    done
}

function derpSetup() {
    echo "Setting up Derp"
    mkdir $HOME/derp
    cd $HOME/derp
    echo "Cloning Derp"
    repo init -u ssh://git@github.com/DerpFest-12/manifest.git -b 12

    echo "Setting up devices tree"
    mkdir $HOME/derp/.repo/local_manifests
    # Thanks to broken room service. Will switch it up when room service becomes functional again
    echo '<?xml version="1.0" encoding="UTF-8"?>
<manifest>
  <remote name="hub" fetch="https://github.com" />
    <remove-project name="vendor_qcom_opensource_display"/>
    <!--Add these projects-->
    <project path="device/oneplus/sm8150-common" name="npv12/device_oneplus_sm8150-common-1" revision="12" remote="hub"/>
    <project path="hardware/oneplus" name="npv12/hardware_oneplus" revision="12" remote="hub"/>
    <project path="vendor/oneplus/sm8150-common" name="AOSP-Krypton/vendor_oneplus_sm8150-common" revision="A12" remote="hub"/>
    <project path="kernel/oneplus/sm8150" name="npv12/kernel_oneplus_sm8150" revision="12" remote="hub"/>
    <project path="vendor/oneplus/guacamole" name="AOSP-Krypton/vendor_oneplus_guacamole" revision="A12" remote="hub" />
    <project path="device/oneplus/guacamole" name="device_oneplus_guacamole" revision="12" remote="derp-devices" />
    <project path="prebuilts/gcc/linux-x86/aarch64/aarch64-elf" name="StatiXOS/android_prebuilts_gcc_linux-x86_aarch64_aarch64-elf" revision="12.0.0" remote="hub"/>
    <project path="vendor/qcom/opensource/display" name="LineageOS/android_vendor_qcom_opensource_display" revision="lineage-19.0" remote="hub" />
</manifest>
' >> $HOME/derp/.repo/local_manifests/guacamole.xml

    repoSync

    echo "Setting up OTA"
    cd
    git clone git@github.com:DerpFest-12/Updater-Stuff.git

    echo "Setting permission"
    chmod 777 $HOME/derp
    echo "DONE"
}

function derpUpload() {
    scp -i $HOME/.ssh/id_ed25519 $HOME/derp/out/target/product/guacamole/DerpFest-12-Official*  npv12@frs.sourceforge.net:/home/frs/project/derpfest/guacamole
    cd $HOME/Updater-Stuff
    cp $HOME/derp/out/target/product/guacamole/guacamole.json $HOME/changelog_guacamole.txt .
    git add .
    git cm -m "guacamole: $(date "+%d/%m/%Y") update"
    git push
}

function backupIncremental() {
    cd ~/kosp/guacamole_incremental
    rclone purge kosp:Incremental/test/guacamole/
    rclone --progress copy . "kosp:Incremental/test/guacamole"
    cd ~/kosp
}

function retrieveIncremental() {
    cd ~/kosp
    rm -rf guacamole_incremental
    rclone --progress copy "kosp:Incremental/test/guacamole/" guacamole_incremental
    chmod 777 -R guacamole_incremental
}

function retrieveReleaseIncremental() {

    local devices=("guacamole" "hotdogb" "hotdog")

    local device_codename=
    for device_codename in ${devices[@]}; do
        cd ~/kosp
        rm -rf ${device_codename}_release_incremental
        rclone --progress copy "kosp:Incremental/release/${device_codename}/" ${device_codename}_release_incremental
        chmod 777 -R ${device_codename}_release_incremental
    done
}

function kospBuildReleases() {
  cd ~/kosp
  source build/envsetup.sh
  local devices=("guacamole" "hotdogb" "hotdog")
  retrieveReleaseIncremental
  local device_codename=
  for device_codename in ${devices[@]}; do
      launch ${device_codename} user -cgfjb -o ${device_codename} -i ${device_codename}_release_incremental --build-both-targets
  done
  cd ~
  git clone git@github.com:AOSP-Krypton/ota.git
  kospUpload
}
