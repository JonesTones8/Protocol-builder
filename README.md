# HEP Builder

A home exercise program builder for PT. It's a static site with no build step, so Vercel serves the files as they are.

- `index.html`: page layout
- `css/styles.css`: styles, including dark mode and the print handout
- `js/exercises.js`: the 1,547-exercise library (edit this to add or change exercises)
- `js/photos.js`: your own exercise photos, stored in the browser (IndexedDB)
- `js/app.js`: everything else

## Run locally

```
python -m http.server 5173
```

Then open http://localhost:5173.

## Data

Programs, favorites and photos are saved **only in the browser you use**. Use **Backup → Download backup** now and then, and **Restore from file** to move everything to another device.

## Deploy to Vercel

1. Put this folder in a GitHub repository.
2. On vercel.com: **Add New → Project**, import the repository, and use the default settings (Framework preset "Other", no build command).
3. Every push to GitHub redeploys the site.
