# Cloudflare Workers Deployment

This project is configured to deploy to Cloudflare Workers using the `@opennextjs/cloudflare` adapter.

## Prerequisites

1. Cloudflare account
2. Cloudflare API token with Workers permissions
3. Cloudflare Account ID

## Setup

### 1. Get Cloudflare Credentials

1. **Account ID**: Found in your Cloudflare dashboard URL or in the right sidebar of any page
2. **API Token**: 
   - Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Click "Create Token"
   - Use "Edit Cloudflare Workers" template
   - Add your account and zone permissions
   - Copy the token

### 2. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

To add secrets:
1. Go to your repository on GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret

## Local Development

```bash
# Standard Next.js dev server
npm run dev

# Preview with Cloudflare adapter (more accurate to production)
npm run preview
```

## Deployment

### Manual Deployment

```bash
npm run deploy
```

### Automatic Deployment

The GitHub Actions workflow automatically deploys when:
- Code is pushed to `main` branch
- A pull request is merged into `main`

The workflow file is located at `.github/workflows/deploy-cloudflare.yml`

## Configuration Files

- `wrangler.toml`: Cloudflare Workers configuration
- `open-next.config.ts`: OpenNext Cloudflare adapter configuration

