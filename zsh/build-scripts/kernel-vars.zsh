#!/bin/zsh

# Tell env that this is a standalone build
IS_KERNEL_STANDALONE=y
export IS_KERNEL_STANDALONE

# Compiler
export COMPILER="Clang"

# Regen defconfig
# read -p "Regenarate defconfig? (Y/N): " DEF_REG
export DEF_REG="N"

# Export custom User and Host
KBUILD_BUILD_USER=npv12
KBUILD_BUILD_HOST=Lucifer
export KBUILD_BUILD_USER KBUILD_BUILD_HOST

PROJECT_DIR=~/kernel
CLANG_DIR=~/clang
PROJECT_DIRECTORY=${PROJECT_DIR}/strix
export PROJECT_DIR PROJECT_DIRECTORY

# AnyKernel3
ANYKERNEL_DIR="${PROJECT_DIR}/AnyKernel3"
export ANYKERNEL_DIR

if [[ ${COMPILER} == *"GCC"* ]]; then
	CROSS_COMPILE="${PROJECT_DIR}/gcc-arm64/bin/aarch64-elf-"
	CROSS_COMPILE_ARM32="${PROJECT_DIR}/gcc32/bin/arm-eabi-"
else
	CLANG_PATH=${CLANG_DIR}/neutron-clang
fi
export CROSS_COMPILE CROSS_COMPILE_ARM32

cd ${PROJECT_DIRECTORY}
CUR_BRANCH=$(git rev-parse --abbrev-ref HEAD)
export CUR_BRANCH

BRANCH=$(git symbolic-ref --short HEAD)
export BRANCH

if [ ${BRANCH} = "master" ]; then
  VBRANCH="stable"
else
  VBRANCH=$BRANCH
fi

VERSION_NUMBER="1"
VERA="Merlin"
VERSION="${VERA}-v${VERSION_NUMBER}"
ZIPNAME="${VERA}-${VBRANCH}-v${VERSION_NUMBER}.zip"
export LOCALVERSION=$(echo "-${VERSION}")
export ZIPNAME
export VERSION_NUMBER

ZIPNAME="${VERA}-${VBRANCH}-v${VERSION_NUMBER}.zip"

DEFCONFIG="vendor/sm8150-perf_defconfig"
export DEFCONFIG

export script_dir=${PROJECT_DIR}/scripts
export IMG_NAME="boot.img"
export NEW_IMG_NAME="${VBRANCH}-v${VERSION_NUMBER}-boot.img"