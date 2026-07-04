# DigitalOcean VPS Deployment

## 1. Create Ubuntu VPS

Create an Ubuntu 22.04 or 24.04 droplet. Point your domain DNS `A` record at the droplet IP.

## 2. Install Node.js and System Packages

```bash
sudo apt update
sudo apt install -y curl git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 3. Clone and Configure

```bash
git clone <your-repo-url> fibertracebox
cd fibertracebox
cp .env.example .env.local
nano .env.local
```

Set:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.example
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
FIBER_RPC_ENABLED=false
FIBER_RPC_LIVE_ENABLED=false
FIBER_RPC_ALLOW_LIVE_PAYMENTS=false
FIBERTRACEBOX_API_KEY=<generate-a-long-random-key>
FIBERTRACEBOX_RATE_LIMIT_MAX=60
FIBERTRACEBOX_RATE_LIMIT_WINDOW_MS=60000
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in browser code or client bundles.
Production write routes refuse requests when `FIBERTRACEBOX_API_KEY` is missing.

If you run FNN on the same VPS, bind its JSON-RPC listener to localhost and set `FIBER_RPC_URL` to that local address. Keep
`FIBER_RPC_ALLOW_LIVE_PAYMENTS=false` until you are ready for FiberTracebox to submit real payments.

## 4. Install, Build, and Run

```bash
npm install
npm run build
pm2 start npm --name fibertracebox -- start
pm2 save
pm2 startup
```

## 5. Configure Nginx

Create `/etc/nginx/sites-available/fibertracebox`:

```nginx
server {
  listen 80;
  server_name your-domain.example;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/fibertracebox /etc/nginx/sites-enabled/fibertracebox
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Add SSL

```bash
sudo certbot --nginx -d your-domain.example
```

## 7. Restart Deployment

```bash
git pull
npm install
npm run build
pm2 restart fibertracebox
```
