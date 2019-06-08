#!/bin/sh

if [ ! -f package.json ]; then
    echo "Run this from the module root"
    exit 1
fi

################################################################
#
# Configure this
#
if [ "$EMAIL" = "" ]; then
    # used for certbot and hopefully alerting you of contact requests
    EMAIL=
fi

if [ "$HOST" = "" ]; then 
    # what domain name you want this to appear at
    # (hostname -A is often wrong)
    # and often you want multi-homing, eg for running
    # multiple versions
    HOST=`hostname -A | tr -d ' '` 
fi

# set PORT if you don't want it to default based on version numer
#PORT=4321

# End Configuration
################################################################

if [ "$EMAIL" = "" ]; then
    echo "This install.sh script needs to be configured"
    exit 1
fi

################################################################
##
## Some of this stuff only needs to run once per host, but it's okay
## to run it again for each new version
##

## Node stuff

# best to do this manually beforehand
#sudo apt-get update
#sudo apt-get upgrade -y
#sudo apt-get install -y curl rsync screen build-essential checkinstall git

if ! node --version; then 

    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
    # make nvm active now
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    
    # we do these as us, NOT SUDO
    nvm install --lts
    nvm use --lts
fi

if sudo ufw status; then
    echo skipping certbot and ufw
else
    sudo apt-get -y install certbot nginx ufw || exit 1

    sudo certbot certonly --agree-tos --eff-email -t -m $EMAIL -d $HOST --standalone --pre-hook 'service nginx stop' --post-hook 'service nginx start' || exit 1

    sudo ufw enable || exit 1
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow http
    sudo ufw allow https
    sudo ufw default deny incoming
    sudo ufw status verbose
fi
    
if [ ! -d /sites/$HOST ]; then
    sudo mkdir -p /sites/$HOST
fi

# Version is used for default port, and maybe elsewhere
VER=`node -e "console.log(require('./package').version)"` || exit 1

# default picking a port based on the version number, which often works
VN=`echo $VER | tr -d .`
PORT=2$VN

CONF=/etc/nginx/sites-available/$HOST
if [ ! -f $CONF ]; then
    # crazy hack
    sudo touch $CONF
    sudo chown `whoami` $CONF
    # sorry
    sed -e "s/example.com/$HOST/g" -e "s/6502/$PORT/g" < admin/nginx-config > $CONF
    sudo rm -f /etc/nginx/sites-enabled/$HOST
    sudo ln -s /etc/nginx/sites-available/$HOST /etc/nginx/sites-enabled/$HOST
else
    echo Already present: $CONF
    exit 1
fi

npm i -g pm2

# this is what pm2 says to do
#  
sudo env PATH=$PATH:$HOME/.nvm/versions/node/v10.16.0/bin $HOME/.nvm/versions/node/v10.16.0/lib/node_modules/pm2/bin/pm2 startup systemd -u `whoami` --hp $HOME

pm2 startup # || exit 1

################################################################
##
## Per version nginx passthru -- better to just use hostnames
##

#cp /etc/nginx/sites-available/$HOST /etc/nginx/sites-available/$HOST-pre$VER
#sudo sed -i.bak "/NEW LOCATIONS HERE/a location /ver-$VN/ { proxy_pass http://127.0.0.1:$PORT/; }" /etc/nginx/sites-available/$HOST
#diff /etc/nginx/sites-available/$HOST-per$VER /etc/nginx/sites-available/$HOST
# echo Try https://$HOST/ver-$VN

## Check out the desired version

################################################################
##
## Start this server
##

npm i
if [ -f env ]; then
    source env
fi

NODE_ENV=PRODUCTION SITEURL=https://$HOST PORT=$PORT pm2 --name server-$VER start server.js
pm2 save

################################################################

sudo nginx -t || exit 1
sudo service nginx restart && echo 'nginx restarted'

