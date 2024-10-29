#!/bin/bash
cd /home/npv12/kosp
source build/envsetup.sh
lunch krypton_guacamole-user
gen_info -j
