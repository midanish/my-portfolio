# Deploying to Cloudflare Pages

This guide will help you deploy your portfolio to Cloudflare Pages with Functions.

## Prerequisites

- GitHub account
- Cloudflare account (free tier works)
- Git repository with your code

## Step 1: Prepare Your Repository

1. **Ensure your repository is up to date:**
   ```bash
   git add .
   git commit -m "Prepare for Cloudflare Pages deployment"
   git push origin main
   ```

2. **Repository structure:**
   ```
   /public          - Static files (HTML, CSS, JS, images)
   /functions       - Cloudflare Functions (serverless backend)
     /api
       portfolio.js - Portfolio data endpoint
       chat.js      - Chat API endpoint
   /data            - Portfolio JSON data
   package.json     - Dependencies
   ```

## Step 2: Deploy to Cloudflare Pages

### Option A: Using Cloudflare Dashboard (Recommended)

1. **Go to Cloudflare Dashboard:**
   - Visit https://dash.cloudflare.com
   - Click "Workers & Pages" in the left sidebar
   - Click "Create application"
   - Select "Pages" tab
   - Click "Connect to Git"

2. **Connect Your Repository:**
   - Select your GitHub account
   - Choose your portfolio repository
   - Click "Begin setup"

3. **Configure Build Settings:**
   - **Project name:** `my-portfolio` (or your preferred name)
   - **Production branch:** `main`
   - **Build command:** Leave empty (not needed for this project)
   - **Build output directory:** `public`
   - **Root directory:** Leave empty

4. **Environment Variables (Optional):**
   If you want to use Hugging Face API with authentication:
   - Add variable: `HF_API_KEY`
   - Value: Your Hugging Face API key (get from https://huggingface.co/settings/tokens)

5. **Deploy:**
   - Click "Save and Deploy"
   - Wait for deployment (usually 1-2 minutes)
   - Your site will be live at `https://your-project.pages.dev`

### Option B: Using Wrangler CLI

```bash
# Login to Cloudflare
npx wrangler login

# Deploy to Pages
npx wrangler pages deploy public --project-name=my-portfolio
```

## Step 3: Configure Custom Domain (Optional)

1. In Cloudflare Pages dashboard:
   - Go to your project
   - Click "Custom domains"
   - Click "Set up a custom domain"
   - Enter your domain name
   - Follow DNS configuration instructions

## Project Features on Cloudflare

✅ **Static site hosting** - All HTML, CSS, JS, images
✅ **Serverless functions** - API routes in `/functions`
✅ **Global CDN** - Fast loading worldwide
✅ **Auto HTTPS** - Free SSL certificate
✅ **Automatic deployments** - Push to Git = auto deploy
✅ **Unlimited bandwidth** - Free tier includes unlimited bandwidth

## API Endpoints

After deployment, your APIs will be available at:

- `GET https://your-site.pages.dev/api/portfolio`
- `POST https://your-site.pages.dev/api/chat`

## Troubleshooting

### Functions not working:
- Ensure files are in `/functions/api/` directory
- Check function format (must export `onRequest` or `onRequestPost`)
- Check Cloudflare Pages logs in dashboard

### Portfolio data not loading:
- Verify `/data/portfolio.json` is in `/public/data/` directory
- Check browser console for errors
- Verify API endpoint returns JSON

### Chat not responding:
- Check if Hugging Face API is responding (check function logs)
- Model might be loading (first request can take 10-20 seconds)
- If model fails, fallback response should still work

## Local Development

To test locally before deploying:

```bash
# Install Wrangler CLI
npm install -D wrangler

# Run local dev server with Functions
npx wrangler pages dev public

# Access at http://localhost:8788
```

## Continuous Deployment

Cloudflare Pages automatically deploys:
- **Production:** When you push to `main` branch
- **Preview:** For every pull request

Each deployment gets a unique URL for testing.

## Cost

Cloudflare Pages Free Tier includes:
- Unlimited requests
- Unlimited bandwidth
- 500 builds per month
- 1 build at a time
- 100,000 Functions requests/day

Perfect for personal portfolios!

## Next Steps

1. ✅ Push your code to GitHub
2. ✅ Connect to Cloudflare Pages
3. ✅ Deploy
4. 🎉 Share your portfolio URL!

---

**Need Help?**
- Cloudflare Pages Docs: https://developers.cloudflare.com/pages
- Cloudflare Functions: https://developers.cloudflare.com/pages/functions
