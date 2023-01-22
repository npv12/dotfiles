#!/usr/bin/env zsh

mkdir ~/temporary # Create a temp dir 
cd ~/temporary
git clone git@github.com:catppuccin/gtk.git
cd gtk
virtualenv -p python3 venv
source venv/bin/activate
pip install -r requirements.txt
python install.py mocha -a maroon -s standard -l
cd ..
git clone git@github.com:npv12/Fluent-icon-theme.git Fluent
cd Fluent
./install.sh red -r -d ~/.icons
cd ../..
rm -rf temporary # Clean up after us
