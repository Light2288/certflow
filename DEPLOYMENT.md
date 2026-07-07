# Deployment Guide

## Environment Variables

For the application to work correctly in production, you need to set up environment variables for data fetching.

### Vercel Deployment

Vercel automatically sets `VERCEL_URL`, so no additional configuration is needed.

### Other Platforms

Set one of the following environment variables:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

Or for platform-specific variables:
- **Netlify**: `URL` (automatically set)
- **Railway**: Set `NEXT_PUBLIC_SITE_URL`
- **Render**: Set `NEXT_PUBLIC_SITE_URL`

### Local Development

No environment variables needed. The app defaults to `http://localhost:3000`.

## Data Files

All certification data is stored under `/public/data/certifications/` and is
served as static files. (Note: data lives in `public/data/` — there is no
top-level `data/` directory.)

Each certification has its own folder plus a shared manifest. Make sure the
manifest and every certification folder are included in your deployment:

- `/public/data/certifications/index.json` — the certification manifest
- `/public/data/certifications/<id>/config.json`
- `/public/data/certifications/<id>/topics.json`
- `/public/data/certifications/<id>/questions.json`

For example, the bundled certifications are `aws-ml` and `snowpro-core`. See
the "Certification Authoring" section of [`README.md`](README.md) for the file
schemas.

## Build Command

```bash
npm run build
```

## Start Command

```bash
npm start
```

## Troubleshooting

### "Failed to load topic details" Error

This error occurs when the application cannot fetch data files. Check:

1. **Environment Variables**: Ensure `VERCEL_URL` or `NEXT_PUBLIC_SITE_URL` is set correctly
2. **Data Files**: Verify files exist in `/public/data/certifications/`
3. **Build Output**: Check that public files are included in the build
4. **Network**: Ensure the deployment can access its own domain

### Testing Deployment Locally

To test the production build locally:

```bash
npm run build
npm start
```

Then visit `http://localhost:3000` to verify everything works.