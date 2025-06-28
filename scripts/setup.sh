# If os is darwin, 
if [[ "$OSTYPE" == "darwin"* ]]; then
    # It is assumed that brew is installed
    ./common/link.sh
    ./mac/install.sh
    ./mac/link.sh
fi