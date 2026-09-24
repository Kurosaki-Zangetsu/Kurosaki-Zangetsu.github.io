# DataNest portfolio

Static site (HTML, CSS, JavaScript). No build step, backend, database or API keys.

## Structure
- `index.html` - all sections (must stay at the repo root)
- `css/styles.css` - design system (colors are CSS variables at the top)
- `js/app.js` - the three demos and navigation; sample datasets are inside this file
- `assets/` - `favicon.svg`, `logo.png`, `logo-512.png`

## Run locally
Open `index.html` in a browser, or run `python -m http.server 8000` in this folder and visit http://localhost:8000.

## Deploy to GitHub Pages
1. Copy the contents of this folder (not the folder itself) into your local clone of `Kurosaki-Zangetsu.github.io`.
2. `git add . && git commit -m "Add DataNest portfolio" && git push`
3. In the repo, open Settings > Pages and set the source to the main branch, root folder. The site appears at https://kurosaki-zangetsu.github.io within a few minutes.

## Notes
- Demos read CSV files only, locally in the browser (5 MB limit per file). Nothing is uploaded.
- All demo data is fictional and labelled as such on the page.
- To change the Fiverr or GitHub links, search for `fiverr.com/datanestpy` and `Kurosaki-Zangetsu` in `index.html`.
