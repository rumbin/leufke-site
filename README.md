# leufke-site

The leufke.de website — Haus Leufke (Hochschwarzwald) & Haus Salzhaff (Ostsee).

Bilingual static site (German / English) built with **Nikola**.

## Build locally

```bash
pip install -r requirements.txt   # or use the pinned venv
nikola build                      # renders into output/
nikola serve                      # local preview at http://localhost:8000
```

## Deploy

Deployment is fully automated via **GitHub Actions**:

- On push to `main`, CI builds the site and deploys to **GitHub Pages**
- The live site is at **https://leufke.de** (custom domain with auto-renewing SSL)
- PR previews are available at the GitHub subdomain
- No manual deploy steps needed

## Structure

```
pages/          Content (reStructuredText + raw HTML). DE = *.rst, EN = *.en.rst
images/         Photos (sw/ = Schwarzwald, os/ = Ostsee)
files/          Static assets (fonts, favicon, CSS, JS)
themes/         Bootswatch "sandstone" theme stack
conf.py         Nikola configuration
```
