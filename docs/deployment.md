# Production Deployment Guide

This guide covers deploying DDN Games to production.

## Prerequisites

- Production server (VPS, cloud instance, etc.)
- Domain name (optional but recommended)
- SSL certificate (for HTTPS/WSS)
- Node.js installed on server

## Step 1: Prepare Environment Files

### Client Production Config

Create `client/.env.production`:

```env
# Authentication Features
VITE_ENABLE_GUEST_LOGIN=true
VITE_ENABLE_GOOGLE_LOGIN=true

# Firebase Configuration (if Google login enabled)
VITE_FIREBASE_API_KEY=your_production_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your_production_app_id

# Production Backend URLs
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

### Server Production Config

Create `server/.env.production`:

```env
# Authentication Features
ENABLE_GUEST_LOGIN=true
ENABLE_GOOGLE_LOGIN=true

# Firebase Admin (if Google login enabled)
GOOGLE_APPLICATION_CREDENTIALS=./credentials/serviceAccountKey.json

# Server Configuration
PORT=2567
NODE_ENV=production
```

## Step 2: Build Client

```bash
cd client
npm run build
```

This creates an optimized production build in `client/dist/`.

## Step 3: Deploy Server

### Option A: PM2 (Recommended)

Install PM2 globally:

```bash
npm install -g pm2
```

Start server with PM2:

```bash
cd server
pm2 start index.js --name ddn-games-server
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

### Option B: systemd Service

Create `/etc/systemd/system/ddn-games.service`:

```ini
[Unit]
Description=DDN Games Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/ddn-games/server
ExecStart=/usr/bin/node index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable ddn-games
sudo systemctl start ddn-games
```

## Step 4: Serve Client

### Option A: Nginx (Recommended)

Install Nginx and configure:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Serve client
    root /path/to/ddn-games/client/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to server
    location /api {
        proxy_pass http://localhost:2567;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Proxy WebSocket connections
    location /colyseus {
        proxy_pass http://localhost:2567;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Option B: Serve with Node.js

Modify `server/index.js` to serve static files:

```javascript
// Add after other middleware
const path = require('path');
app.use(express.static(path.join(__dirname, '../client/dist')));

// Add before Colyseus setup
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
```

## Step 5: SSL Certificate

### Using Let's Encrypt (Free)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Certbot will automatically configure Nginx with SSL.

## Step 6: Firewall Configuration

Allow necessary ports:

```bash
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 2567/tcp # Game server (if not behind Nginx)
sudo ufw enable
```

## Step 7: Monitoring

### PM2 Monitoring

```bash
pm2 monit              # Real-time monitoring
pm2 logs ddn-games-server  # View logs
pm2 restart ddn-games-server  # Restart server
```

### Health Check

Add a health check endpoint (already included):

```bash
curl https://api.yourdomain.com/api/health
```

## Environment-Specific Considerations

### Guest Login Only

If using only guest login:

```env
# Client
VITE_ENABLE_GUEST_LOGIN=true
VITE_ENABLE_GOOGLE_LOGIN=false
# No Firebase config needed

# Server
ENABLE_GUEST_LOGIN=true
ENABLE_GOOGLE_LOGIN=false
# No Firebase credentials needed
```

### Google Login Only

If using only Google login:

```env
# Client
VITE_ENABLE_GUEST_LOGIN=false
VITE_ENABLE_GOOGLE_LOGIN=true
# Firebase config required

# Server
ENABLE_GUEST_LOGIN=false
ENABLE_GOOGLE_LOGIN=true
# Firebase credentials required
```

## Troubleshooting

### WebSocket Connection Failed

- Ensure Nginx is configured to proxy WebSocket connections
- Check firewall allows port 2567 (or use Nginx proxy)
- Verify `VITE_WS_URL` uses `wss://` (not `ws://`)

### Firebase Auth Errors

- Verify production Firebase credentials
- Check authorized domains in Firebase Console
- Ensure service account key is on production server

### Build Errors

- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version matches development
- Verify all environment variables are set

## Security Checklist

- [ ] Use HTTPS/WSS in production
- [ ] Keep service account keys secure
- [ ] Enable firewall
- [ ] Regular security updates
- [ ] Monitor server logs
- [ ] Backup database regularly
- [ ] Use environment variables for secrets

## Scaling

For high traffic:

- Use load balancer (Nginx, HAProxy)
- Run multiple server instances
- Use Redis for session storage
- Consider CDN for static assets
- Monitor performance with tools like New Relic

## See Also

- [Guest Login Setup](auth-guest.md)
- [Firebase Setup](auth-firebase.md)
- [Quick Setup Guide](setup.md)
