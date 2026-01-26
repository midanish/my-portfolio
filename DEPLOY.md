# 🚀 Quick Deployment Guide

Deploy your portfolio to Cloudflare Pages in 5 minutes!

## 📋 Pre-Deployment Checklist

✅ Code is ready for deployment
✅ Data folder moved to `public/data/`
✅ Cloudflare Functions created in `/functions/api/`
✅ Git repository connected

## 🎯 Deployment Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Ready for Cloudflare Pages deployment"
git push origin main
```

### 2. Deploy to Cloudflare Pages

**Go to:** https://dash.cloudflare.com

1. Click **"Workers & Pages"** → **"Create application"**
2. Select **"Pages"** → **"Connect to Git"**
3. Choose your repository: `midanish/my-portfolio`
4. Configure:
   - **Project name:** `my-portfolio`
   - **Build output directory:** `public`
   - **Build command:** (leave empty)
5. Click **"Save and Deploy"**

### 3. Wait for Deployment

⏱️ Takes ~1-2 minutes

Your site will be live at: `https://my-portfolio-xxx.pages.dev`

## 🧪 Test Locally First

```bash
# Test with Cloudflare's local environment
npm run dev:cloudflare

# Visit: http://localhost:8788
```

## 🔧 Configuration

### Environment Variables (Optional)

For better Hugging Face API performance:

1. Go to your Cloudflare Pages project
2. Settings → Environment variables
3. Add:
   - **Name:** `HF_API_KEY`
   - **Value:** Get from https://huggingface.co/settings/tokens

### Custom Domain

1. Pages project → Custom domains
2. Add your domain
3. Update DNS records as shown

## 📊 What Gets Deployed

✅ Static files from `/public/`
✅ Serverless functions from `/functions/`
✅ Portfolio data from `/public/data/`
✅ Chat API with RAG
✅ All styles, scripts, and assets

## 🎨 Features Live on Cloudflare

- Portfolio RAG Chatbot
- Food Image Classification link
- Video demos (face recognition, dental)
- macOS-style glassmorphic UI
- Responsive design
- Fast global CDN

## 🔄 Auto-Deploy

Every push to `main` branch = automatic deployment!

## 💰 Cost

**FREE** on Cloudflare Pages:
- Unlimited bandwidth
- Unlimited requests
- 100K Function calls/day
- SSL certificate included

## 🐛 Troubleshooting

**Portfolio not loading:**
```bash
# Check if data is in right place
ls public/data/portfolio.json
```

**Chat not working:**
- First request takes 10-20s (model loading)
- Check browser console for errors
- Fallback responses work even if model fails

**Local testing:**
```bash
npm run dev:cloudflare
```

## 📚 Full Documentation

See `CLOUDFLARE_DEPLOYMENT.md` for detailed documentation.

## ✨ Next Steps

1. ✅ Deploy to Cloudflare
2. 🌐 Get your live URL
3. 📱 Share your portfolio
4. 🎉 Celebrate!

---

**Your repository:** https://github.com/midanish/my-portfolio
**Cloudflare Dashboard:** https://dash.cloudflare.com
