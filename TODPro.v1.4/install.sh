sudo apt update &&
sudo apt upgrade &&
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash &&
source ~/.bashrc &&
nvm install 20.10.0 &&
npm i pm2 --global &&
npm i &&
pm2 start index.js --name 'TODServer'