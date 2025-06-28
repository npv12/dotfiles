#!/bin/bash

user="npv12"  
lunch_command="derp"
device_codename="guacamole"
build_type="user"

# Rom G-Apps Command

gapps_command="WITH_GAPPS" 

# To build with gapps or no )(yes|no)

# Make command  : yes|no|bacon
# Yes for brunch 
# No make romname 
# Bacon for make bacon

with_gapps="no"
use_brunch="yes" 
folder="/home/${user}/derpfest" # Folder Name 
rom_name="Derp"*.zip # Zip name
OUT_PATH="$folder/out/target/product/${device_codename}"
ROM=${OUT_PATH}/${rom_name}

# If  building apk put the apk name here 

target_name="<no>"

# Uncomment set to (yes|no(default)|installclean)

# make_clean="installclean"
# make_clean="yes"

priv_to_me="/home/configs/priv.conf"
newpeeps="/home/configs/"${user}.conf

cd "$folder"

echo -e "Build starting thank you for waiting"
BLINK="https://ci.goindi.org/job/$JOB_NAME/$BUILD_ID/console"

read -r -d '' priv <<EOT
<b>Build Started</b>
<b>Rom:</b> ${lunch_command} 
<b>User:</b> ${user}
<b>Console log:</b> <a href="${BLINK}">here</a>
EOT

sudo telegram-send --format html "$priv" --config ${priv_to_me} --disable-web-page-preview 
sudo telegram-send --format html "$priv" --config ${newpeeps} --disable-web-page-preview

export CCACHE_EXEC=$(which ccache)
export USE_CCACHE=1
export CCACHE_DIR=${folder}/../ccache

if [ -d ${CCACHE_DIR} ]; then

	sudo chmod -R 777 ${CCACHE_DIR}
	echo "ccache folder already exists."

else

	sudo mkdir  ${CCACHE_DIR}
	sudo chmod -R 777 ${CCACHE_DIR}
	echo "modifying ccache dir permission."
fi

ccache -M 100G
source build/envsetup.sh

if [ "$with_gapps" = "yes" ]; 
then
	export "$gapps_command"=true
else
	export "$gapps_command"=false
fi

if [ "$make_clean" = "yes" ]; then
	rm -rf out 
	echo -e "Clean Build";
fi
if [ "$make_clean" = "installclean" ]; then
	rm -rf ${OUT_PATH}
	echo -e "Install Clean";
fi

rm -rf ${OUT_PATH}/*.zip
lunch ${lunch_command}_${device_codename}-${build_type}

if [ "$target_name" = "<no>" ]; then

	if [ "$use_brunch" = "yes" ]; then
		brunch ${device_codename}
	fi
	
	if [ "$use_brunch" = "no" ]; then
		make  ${lunch_command} -j$(nproc --all)
	fi
	
	if [ "$use_brunch" = "bacon" ]; then
		make bacon -j$(nproc --all)
	fi
	else
		make $target_name
fi

if [ -f $ROM ]; then

	mkdir -p /home/downloads/${user}/${device_codename}
	cp $ROM /home/downloads/${user}/${device_codename}

	filename="$(basename $ROM)"
	LINK="https://download.goindi.org/${user}/${device_codename}/${filename}"
	size="$(du -h ${ROM}|awk '{print $1}')"
	mdsum="$(md5sum ${ROM}|awk '{print $1}')"

	read -r -d '' priv <<EOT
	<b>Build Completed</b>
	<b>Rom:</b> ${lunch_command} 
	<b>User:</b> ${user}
	<b>Download:</b> <a href="${LINK}">here</a>
	<b>Size:</b> <pre> ${size}</pre>
	<b>MD5:</b> <pre> ${mdsum}</pre>
EOT

	sudo telegram-send --format html "$priv" --config ${priv_to_me} --disable-web-page-preview 
	sudo telegram-send --format html "$priv" --config ${newpeeps} --disable-web-page-preview

else

	read -r -d '' priv <<EOT
	<b>Error</b>
	<b>Rom:</b> ${lunch_command} 
	<b>User:</b> ${user}
	<b>Check error:</b> <a href="https://ci.goindi.org/job/$JOB_NAME/$BUILD_ID/console">here</a>
EOT

	sudo telegram-send --format html "$priv" --config ${priv_to_me} --disable-web-page-preview 
	sudo telegram-send --format html "$priv" --config ${newpeeps} --disable-web-page-preview
fi