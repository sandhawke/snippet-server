Here's how I set up a server, more or less.

1. Create a Debian 9.7 x64 server. Any Debian-ish server should work.

2. Connect to that machine and check out the code

```
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl rsync screen build-essential checkinstall git

export VER=0.2.3
git clone https://github.com/sandhawke/snippet-server.git server-$VER
cd server-$VER
git checkout v$VER
```

3. Maybe customize the install script, or set parameters

```           
EMAIL=sandro@example.com HOST=snippet.flextag.org sh admin/install.sh
```

If prompted:

```
Command may disrupt existing ssh connections. Proceed with operation (y|n)? y
```

it's okay to say 'y'.
