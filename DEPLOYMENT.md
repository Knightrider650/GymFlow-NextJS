# GymFlow Deployment Guide

Complete guide to deploy GymFlow to production.

## Prerequisites

- Git
- Node.js v18+
- npm or yarn
- Docker (for containerized deployment)
- AWS account (for AWS deployment)
- Vercel account (for frontend hosting)

## Quick Deployment

### Option 1: Deploy Frontend to Vercel (Easiest)

1. **Push code to GitHub**
```bash
git init
git add .
git commit -m "Initial GymFlow commit"
git remote add origin https://github.com/yourusername/gymflow-nextjs.git
git push -u origin main
```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Set environment variables:
     ```
     NEXT_PUBLIC_API_URL=your_backend_url
     NEXT_PUBLIC_WS_URL=your_backend_url
     ```
   - Click "Deploy"

Your frontend will now be live at `yourapp.vercel.app`

### Option 2: Deploy Backend & Frontend Together

#### Backend Deployment (Node.js on Heroku/Railway/Render)

1. **Create Procfile in backend directory**
```
web: node server.js
```

2. **Set up PostgreSQL**
   - Use managed PostgreSQL service (AWS RDS, Heroku Postgres, Railway, etc.)
   - Create database and get connection string

3. **Deploy to Railway.app (Recommended)**
   - Connect GitHub repository
   - Add environment variables:
     ```
     DATABASE_URL=postgresql://user:password@host/dbname
     NODE_ENV=production
     JWT_SECRET=your_secret_key
     CORS_ORIGIN=your_frontend_url
     ```
   - Railway auto-deploys on git push

#### Frontend Deployment (Next.js on Vercel)

Follow Option 1 above

### Option 3: Docker Deployment

#### Build Docker Image

**Frontend Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Build and push image**
```bash
docker build -t gymflow-frontend:latest .
docker tag gymflow-frontend:latest yourdockerhub/gymflow-frontend:latest
docker push yourdockerhub/gymflow-frontend:latest
```

**Deploy to AWS ECR/ECS or other container service**

### Option 4: Manual VPS Deployment

1. **SSH into your VPS**
```bash
ssh ubuntu@your.vps.ip
```

2. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Clone repository**
```bash
cd /home/ubuntu
git clone https://github.com/yourusername/gymflow-nextjs.git
cd gymflow-nextjs
```

4. **Install dependencies**
```bash
npm install --production
```

5. **Build production bundle**
```bash
npm run build
```

6. **Set up PM2 process manager**
```bash
sudo npm install -g pm2
pm2 start "npm start" --name "gymflow"
pm2 startup
pm2 save
```

7. **Set up Nginx reverse proxy**
```bash
sudo apt-get install nginx
```

Edit `/etc/nginx/sites-available/default`:
```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo service nginx restart
```

8. **Enable HTTPS with Let's Encrypt**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

---

## Environment Variables Setup

Create `.env.production` with:

```env
# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=https://api.yourdomain.com
NEXT_PUBLIC_JWT_SECRET=your_production_secret_key

# Backend
DATABASE_URL=postgresql://user:password@host:5432/dbname
NODE_ENV=production
JWT_SECRET=your_production_secret_key
CORS_ORIGIN=https://yourdomain.com
PORT=5000
```

---

## Database Setup (PostgreSQL)

### AWS RDS Setup

1. Create RDS instance:
   - Engine: PostgreSQL 14+
   - Instance class: db.t3.micro (free tier)
   - Storage: 20 GiB
   - Enable backups: Yes

2. Get connection string:
   ```
   postgresql://username:password@rds-instance-id.region.rds.amazonaws.com:5432/gymflow
   ```

3. Run migrations (from backend):
   ```bash
   npm run migrate
   ```

### Local PostgreSQL (Development)

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb gymflow

# Create user
sudo -u postgres createuser gymflow_user -P

# Grant privileges
sudo -u postgres psql -c "ALTER USER gymflow_user WITH SUPERUSER;"
```

---

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database created and migrated
- [ ] Build completes without errors (`npm run build`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Security: Remove any hardcoded secrets
- [ ] CORS settings correct for production domain
- [ ] SSL/HTTPS enabled
- [ ] Database backups configured
- [ ] Error logging set up
- [ ] Monitoring configured

---

## Post-Deployment

### Verify Deployment

1. **Test Frontend**
   - Navigate to your domain
   - Login with test account
   - Test key features

2. **Test API**
   ```bash
   curl https://api.yourdomain.com/api/health
   ```

3. **Check Logs**
   ```bash
   # Vercel
   vercel logs

   # Railway
   railway logs

   # PM2
   pm2 logs
   ```

### Monitor Performance

- Set up error tracking (Sentry, DataDog)
- Set up performance monitoring (New Relic, Datadog)
- Enable database query logging
- Monitor server resources

### Scaling Strategies

**If experiencing high traffic:**

1. **Frontend Caching**
   - Enable CDN (CloudFront, Cloudflare)
   - Set cache headers in `next.config.js`

2. **Database Optimization**
   - Add indexes to frequently queried columns
   - Enable read replicas
   - Implement connection pooling

3. **API Scaling**
   - Load balance with multiple instances
   - Cache API responses
   - Use message queues for heavy operations

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues
```bash
# Test connection
psql postgresql://user:password@host/dbname
```

### Deployment Fails
1. Check logs
2. Verify environment variables
3. Ensure database is running
4. Check Node.js version

---

## Rollback Procedures

### Vercel Rollback
- Dashboard → Deployments → Previous version → Redeploy

### Manual Rollback
```bash
git revert <commit-id>
git push
# Re-deploy
```

---

## Security in Production

- [ ] Enable HTTPS
- [ ] Set secure password policies
- [ ] Enable 2FA for admin accounts
- [ ] Set up rate limiting
- [ ] Configure firewall rules
- [ ] Regular security audits
- [ ] Keep dependencies updated

---

## Support

Need help? Check:
- Backend repository issues
- Environment variable setup
- Database configuration
- Deployment logs

---

**Successfully deployed? Celebrate! 🎉**
