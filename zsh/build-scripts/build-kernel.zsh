#!/bin/zsh

function kernel-build() {
    convertsecs() {
	((h=${1}/3600))
    	((m=(${1}%3600)/60))
    	((s=${1}%60))
    	printf "%02dm %02ds\n" $m $s
    }
    zsh_add_file "build-scripts/kernel-vars"

    # Exit if the project is not found
    cd ${ANYKERNEL_DIR} || return 1
    cd ${PROJECT_DIRECTORY} || return 1

    if [ "$#" -ne  "0" ]; then
        if [ "$1" -eq "-c" ] || [ "$1" -eq "-clean" ]; then
            echo "Cleaning out"
            rm -rf out && mkdir out
        fi
    else
        echo "No arguments supplied. Not cleaning out"
    fi

    

    # compilation
    #
    # First we need number of jobs
    COUNT="$(grep -c '^processor' /proc/cpuinfo)"
    export JOBS="$((COUNT * 2))"

    export ARCH=arm64
    export SUBARCH=arm64

    echo "Building on branch: $BRANCH"

    echo "Version: $VERSION"

    make O=out ${DEFCONFIG}

    if [ $DEF_REG = "Y" ] || [ $DEF_REG = "y" ]; then
            cp out/.config arch/arm64/configs/${DEFCONFIG}
            git add arch/arm64/configs/${DEFCONFIG}
            git commit --signoff -m "strix: Regenerate and save

    This is an auto-generated commit"
    fi

    START=$(date +"%s")

    if [[ ${COMPILER} == "GCC" ]]; then
        make -j${JOBS} O=out
    else
        export KBUILD_COMPILER_STRING="$(${CLANG_PATH}/bin/clang --version | head -n 1 | sed -e 's/  */ /g' -e 's/[[:space:]]*$//')";

        PATH="${CLANG_PATH}/bin:${PATH}" \
        make O=out -j${JOBS} \
        CC="clang" \
        CLANG_TRIPLE="aarch64-linux-gnu-" \
        CROSS_COMPILE="aarch64-linux-gnu-" \
        CROSS_COMPILE_ARM32="arm-linux-gnueabi-" \
        LD=ld.lld \
        AR=llvm-ar \
        NM=llvm-nm \
        OBJCOPY=llvm-objcopy \
        OBJDUMP=llvm-objdump \
        STRIP=llvm-strip | tee build.log
    fi

    END=$(date +"%s")
    DIFF=$((END - START))

    export OUT_IMAGE="${PROJECT_DIRECTORY}/out/arch/arm64/boot/Image.gz-dtb"

    if [ ! -f "${OUT_IMAGE}" ]; then
        echo "Build failed RETARD!"
        return 1;
    fi

    # Move kernel image and dtb to anykernel3 folder
    cp ${OUT_IMAGE} ${ANYKERNEL_DIR}
    find out/arch/arm64/boot/dts -name '*.dtb' -exec cat {} + > ${ANYKERNEL_DIR}/dtb

    # POST ZIP
    cd ${ANYKERNEL_DIR}
    rm -rf *.zip
    zip -r9 "${ZIPNAME}" * -x .git "Image"
    rclone --progress copy *.zip --include "${file_name}" drive:

    # Increment build number
    cd ../
    VERSION=`grep VERSION_NUMBER= $ZSH_DIR/build/scripts/kernel-vars.zsh | grep -P -o '[0-9]+'`
    sed -i 's/^\(VERSION_NUMBER=\"\)\(.*\)\"$/\1'$(expr $VERSION + 1)'\"/' $ZSH_DIR/build/scripts/kernel-vars.zsh
}

function kernel-update-clang() {
    cd ~/clang/neutron-clang
    ./antman -Uy
}

function kernel-setup() {
    cd ~
    mkdir -p ~/clang/neutron-clang
    cd ~/clang/neutron-clang
    curl -LO "https://raw.githubusercontent.com/Neutron-Toolchains/antman/main/antman"
    ./antman -S
    git clone git@github.com:npv12/strix.git kernel/strix
    git clone git@github.com:nem0-z/AnyKernel3.git kernel/AnyKernel3
}
