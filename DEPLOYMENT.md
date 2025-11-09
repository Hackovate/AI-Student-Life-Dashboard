# 🚀 Deployment Guide: Vercel + Neon + Render (Free Stack)

Complete step-by-step guide to deploy Momentum application using free hosting services.

## 📋 Architecture Overview

- **Frontend (client/)**: Vercel (free, fast CDN)
- **Backend (backend/)**: Render Web Service (free tier)
- **AI Service (momentum-ai/)**: Render Web Service (free tier)
- **PostgreSQL**: Neon (free tier, 0.5 GB)
- **ChromaDB**: Render persistent disk (`/opt/render/project/src/chroma_db`)

## ✅ Prerequisites

1. ✅ GitHub account with your repository pushed
2. ✅ Neon PostgreSQL account created
3. ✅ Neon connection string copied
4. ✅ Gemini API key ready

---

## Part 1: Neon PostgreSQL Setup

### Step 1: Create Neon Database

1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Click **"Create Project"**
4. Choose a project name (e.g., "momentum-db")
5. Select **"Free"** tier
6. Click **"Create Project"**

### Step 2: Get Connection String

1. In your Neon dashboard, click on your project
2. Go to **"Connection Details"**
3. Copy the connection string (looks like):
   ```
   postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
4. **Save this** - you'll need it for Render backend

---

## Part 2: Render - Backend Service

### Step 1: Deploy Backend to Render

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository
5. Configure the service:
   - **Name**: `momentum-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend` ⚠️ **CRITICAL: Must be set to `backend`**
   - **Build Command**: `npm install --include=dev && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: **Free**

6. Click **"Create Web Service"**

**⚠️ IMPORTANT**: If you're using `render.yaml`, make sure it includes `rootDir: backend`. If the Root Directory is not set correctly, the build will fail with "Could not read package.json" error.

### Step 2: Set Environment Variables

In Render dashboard → Backend Service → **Environment** tab, add:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://... (paste your Neon connection string)
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
CLIENT_URL=https://your-app.vercel.app (set after Vercel deployment)
AI_SERVICE_URL=https://momentum-ai-service.onrender.com (set after AI service deploys)
```

**Important**: 
- Replace `DATABASE_URL` with your actual Neon connection string
- Generate a strong `JWT_SECRET` (at least 32 characters)
- `CLIENT_URL` and `AI_SERVICE_URL` will be set after other services deploy

### Step 3: Database Migrations (Automatic)

**✅ Migrations run automatically on server startup!**

The backend server automatically runs database migrations when it starts in production mode. You don't need to run them manually.

**How it works:**
- On first deployment, migrations will run automatically when the server starts
- On subsequent deployments, migrations will check and apply any new migrations
- If migrations fail, the server will log a warning but continue running (to prevent blocking deployments)

**Note**: `prisma generate` is already included in the build command, so Prisma client is generated automatically during deployment.

**For local development** (if you need to run migrations manually):
```bash
cd backend
export DATABASE_URL="postgresql://..." # Your Neon connection string
npx prisma migrate deploy
```

**Important**: Both `prisma` CLI and `@prisma/client` are in `dependencies` because migrations run automatically on server startup in production.

### Step 4: Get Backend URL

1. After deployment completes, Render will provide a URL like:
   ```
   https://momentum-backend.onrender.com
   ```
2. **Save this URL** - you'll need it for:
   - Frontend `VITE_API_URL` environment variable
   - AI Service `CORS_ORIGINS` environment variable

---

## Part 3: Render - AI Service

### Step 1: Deploy AI Service to Render

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect the same GitHub repository
3. Configure the service:
   - **Name**: `momentum-ai-service`
   - **Environment**: `Python 3`
   - **Region**: Same as backend
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `momentum-ai` ⚠️ **CRITICAL: Must be set to `momentum-ai`**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn ai_service:app --host 0.0.0.0 --port $PORT`
   - **Plan**: **Free**

4. Click **"Create Web Service"**

**⚠️ IMPORTANT**: If you're using `render.yaml`, make sure it includes `rootDir: momentum-ai`. If the Root Directory is not set correctly, the build will fail.

### Step 2: Set Environment Variables

In Render dashboard → AI Service → **Environment** tab, add:

```
PORT=10000
GEMINI_API_KEY=your-gemini-api-key-here
VECTOR_DIR=/opt/render/project/src/chroma_db
CORS_ORIGINS=https://your-app.vercel.app,https://momentum-backend.onrender.com
GEMINI_MODEL=gemini-2.5-flash
TEMPERATURE=0.1
```

**Important**:
- Replace `GEMINI_API_KEY` with your actual Gemini API key
- `CORS_ORIGINS` should include both Vercel frontend URL and Render backend URL
- ChromaDB will persist data in `/opt/render/project/src/chroma_db`

### Step 3: Get AI Service URL

1. After deployment completes, Render will provide a URL like:
   ```
   https://momentum-ai-service.onrender.com
   ```
2. **Update Backend Environment Variable**:
   - Go to Backend Service → Environment
   - Update `AI_SERVICE_URL` to: `https://momentum-ai-service.onrender.com`

---

## Part 4: Vercel - Frontend

### Step 1: Deploy Frontend to Vercel

**Option A: GitHub Integration (Recommended)**

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import your GitHub repository
5. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client` (click "Edit" and set to `client`)
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `dist` (should auto-detect)
   - **Install Command**: `npm install` (should auto-detect)

6. Click **"Deploy"**

**Option B: Vercel CLI**

```bash
cd client
npm install -g vercel
vercel login
vercel
# Follow prompts, set root directory to "client"
```

### Step 2: Set Environment Variables

In Vercel dashboard → Your Project → **Settings** → **Environment Variables**, add:

```
VITE_API_URL=https://momentum-backend.onrender.com/api
```

**Important**: Replace with your actual Render backend URL

### Step 3: Redeploy

After setting environment variables:
1. Go to **Deployments** tab
2. Click **"..."** on latest deployment → **"Redeploy"**
3. Or push a new commit to trigger redeploy

### Step 4: Get Frontend URL

1. After deployment, Vercel will provide a URL like:
   ```
   https://your-app.vercel.app
   ```
2. **Update Backend Environment Variable**:
   - Go to Render → Backend Service → Environment
   - Update `CLIENT_URL` to: `https://your-app.vercel.app`
3. **Update AI Service Environment Variable**:
   - Go to Render → AI Service → Environment
   - Update `CORS_ORIGINS` to include your Vercel URL:
     ```
     https://your-app.vercel.app,https://momentum-backend.onrender.com
     ```

---

## Part 5: Final Configuration

### Update All Environment Variables

**Render - Backend:**
```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://... (from Neon)
JWT_SECRET=your-secret-key
CLIENT_URL=https://your-app.vercel.app (from Vercel)
AI_SERVICE_URL=https://momentum-ai-service.onrender.com (from Render AI service)
```

**Render - AI Service:**
```
PORT=10000
GEMINI_API_KEY=your-gemini-key
VECTOR_DIR=/opt/render/project/src/chroma_db
CORS_ORIGINS=https://your-app.vercel.app,https://momentum-backend.onrender.com
GEMINI_MODEL=gemini-2.5-flash
TEMPERATURE=0.1
```

**Vercel - Frontend:**
```
VITE_API_URL=https://momentum-backend.onrender.com/api
```

### Restart Services

After updating environment variables:
1. **Render Backend**: Go to **Manual Deploy** → **Deploy latest commit**
2. **Render AI Service**: Go to **Manual Deploy** → **Deploy latest commit**
3. **Vercel Frontend**: Will auto-redeploy on next commit, or manually redeploy

---

## Part 6: Testing & Verification

### 1. Test Backend API

```bash
curl https://momentum-backend.onrender.com/api/health
```

Should return: `{"status":"OK","message":"Server is running"}`

### 2. Test AI Service

```bash
curl https://momentum-ai-service.onrender.com/health
```

Should return: `{"status":"ok"}`

### 3. Test Frontend

1. Open your Vercel URL: `https://your-app.vercel.app`
2. Check browser console for errors
3. Try logging in/registering
4. Test API calls

### 4. Verify Database

1. Check Render backend logs for database connection
2. Try creating a user account
3. Verify data appears in Neon dashboard

### 5. Verify ChromaDB

1. Use AI features (chat, syllabus generation)
2. Check Render AI service logs
3. ChromaDB data persists in `/opt/render/project/src/chroma_db`

---

## 🆘 Troubleshooting

### Backend can't connect to database

- ✅ Verify `DATABASE_URL` is correct (from Neon)
- ✅ Check Neon dashboard - database is active
- ✅ Ensure connection string includes `?sslmode=require`
- ✅ Run migrations: `npx prisma migrate deploy`

### Frontend can't connect to backend

- ✅ Verify `VITE_API_URL` is set correctly in Vercel
- ✅ Check backend CORS allows Vercel domain
- ✅ Verify backend is running (check Render logs)
- ✅ Check browser console for CORS errors

### AI Service not working

- ✅ Verify `GEMINI_API_KEY` is set correctly
- ✅ Check `CORS_ORIGINS` includes frontend and backend URLs
- ✅ Verify `AI_SERVICE_URL` in backend is correct
- ✅ Check Render AI service logs for errors

### Render services spinning down

**Issue**: Free tier services sleep after 15 min inactivity (first request takes 30-60s)

**Solution**: Use a free uptime monitor:
1. Go to [UptimeRobot](https://uptimerobot.com) (free)
2. Add monitor for:
   - Backend: `https://momentum-backend.onrender.com/api/health`
   - AI Service: `https://momentum-ai-service.onrender.com/health`
3. Set interval to 5 minutes
4. This keeps services awake

### ChromaDB data not persisting

- ✅ Verify `VECTOR_DIR=/opt/render/project/src/chroma_db` is set
- ✅ Check Render persistent disk is available (free tier includes it)
- ✅ Restart AI service after setting `VECTOR_DIR`

---

## 📊 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Free | $0/month |
| Neon | Free (0.5 GB) | $0/month |
| Render Backend | Free | $0/month |
| Render AI Service | Free | $0/month |
| **Total** | | **$0/month** |

**Limitations**:
- Render free tier: Services sleep after 15 min (use UptimeRobot to keep awake)
- Neon free tier: 0.5 GB storage (sufficient for development)
- Vercel: Generous free tier limits

---

## 🔄 Updating After Deployment

### To update code:

1. **Push to GitHub** (main branch)
2. **Render**: Auto-deploys on push (or manually trigger)
3. **Vercel**: Auto-deploys on push

### To update environment variables:

1. **Render**: Dashboard → Service → Environment → Update → Redeploy
2. **Vercel**: Dashboard → Project → Settings → Environment Variables → Update → Redeploy

---

## 📝 Quick Reference URLs

After deployment, you'll have:

- **Frontend**:** `https://your-app.vercel.app`
- **Backend**:** `https://momentum-backend.onrender.com`
- **AI Service**:** `https://momentum-ai-service.onrender.com`
- **Database**:** Neon dashboard (connection string only)

---

## ✅ Deployment Checklist

- [ ] Neon PostgreSQL created and connection string copied
- [ ] Backend deployed to Render with environment variables set
- [ ] Database migrations run successfully
- [ ] AI Service deployed to Render with environment variables set
- [ ] Frontend deployed to Vercel with `VITE_API_URL` set
- [ ] All environment variables updated with correct URLs
- [ ] All services restarted after environment variable updates
- [ ] Backend health check passes
- [ ] AI Service health check passes
- [ ] Frontend loads and connects to backend
- [ ] Authentication works
- [ ] AI features work
- [ ] Database operations work
- [ ] ChromaDB persistence verified

---

## 🎉 You're Done!

Your application is now deployed on a completely free stack:
- ✅ Fast frontend on Vercel
- ✅ Backend and AI service on Render
- ✅ PostgreSQL on Neon
- ✅ ChromaDB on Render persistent disk

**Total Cost: $0/month** 🎊

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)

