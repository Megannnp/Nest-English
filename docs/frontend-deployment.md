# Frontend Deployment Notes

The client uses `BrowserRouter`, so production hosting must route all frontend paths back to `index.html`. Without this fallback, direct visits such as `/app/write` or `/app/workbench` can return a server-side 404 even though the route works inside the app.

## Nginx

```nginx
server {
  listen 80;
  server_name example.com;

  root /var/www/nest-client/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Vercel

Create `vercel.json` in the deployed frontend root:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Netlify

Create `public/_redirects` before building:

```text
/* /index.html 200
```

## Quick Check

After deployment, open these URLs directly in a new browser tab:

- `/`
- `/writing`
- `/writing/grade`
- `/grammar`
- `/reading`
- `/phonetics`
- `/phonetics/sound`
- `/phonetics/combos`
- `/vocab`
- `/vocab/flashcard`
- `/listening`
- `/listening/practice`
- `/speaking`
- `/app/tasks`
- `/app/mine`
- `/app/workbench`
- `/app/writings/example-id`

If any app route returns a server 404 instead of loading the React app, the hosting fallback is not configured correctly.

## Route Registration Checklist

When adding a new public page, update all of these files together:

- `client/src/app/routes.js`: URL <-> page id mapping
- `client/src/app/navigation.js`: role-level page allowlist
- `client/src/app/AppPageContent.jsx`: authenticated/public page rendering
- `client/src/app/GuestAppShell.jsx`: guest rendering
- `client/src/app/AuthenticatedAppShell.jsx`: full-width layout list when the page owns its own chrome
- `client/src/app/pagePreloaders.js`: lazy preloading target
- `client/src/app/siteTheme.js`: body theme and product background
- `client/src/app/routes.test.js` and `client/src/app/AppPageContent.test.jsx`: regression coverage

This checklist is especially important for product areas such as reading, phonetics, vocab, listening, and speaking because they are mostly frontend routes.
