# Working on this site (GitHub Flow)

This project uses a lightweight **GitHub Flow** workflow: every change happens on a
short-lived **feature branch**, is verified by **CI**, and reaches the live site only
by merging a **pull request** into `main`. The deploy to GitHub Pages is automatic.

## The rule in one line

> `main` is always deployable. Never push to it directly — every change lands via a
> reviewed, CI-green pull request.

## Workflow

1. **Start from a fresh `main`**
   ```bash
   git checkout main
   git pull
   ```

2. **Create a feature branch with a descriptive name**
   ```bash
   git checkout -b fix/carousel-height      # or feat/..., docs/..., chore/...
   ```

3. **Commit your work in small, logical commits**, then push:
   ```bash
   git add -A
   git commit -m "Short imperative summary of the change"
   git push -u origin fix/carousel-height
   ```

4. **Open a pull request** in the GitHub UI (or `gh pr create`). CI
   (`Build & test`) runs the build plus the two integration tests:
   - carousel slide heights must not jump
   - external links must resolve

5. **Wait for CI to be green**, then **merge** the PR into `main`. CI deploys to
   GitHub Pages automatically. Delete the feature branch after merging.

## Why branch protection matters

If branch protection is enabled on `main` (see below), GitHub **blocks** merging a
PR whose CI is red or failed — so a broken change cannot reach the live site. This
is what prevents things like an unverified dependency upgrade or a build error from
disrupting the deployed site.

## Branch protection on `main` (recommended, one-time UI setup)

GitHub requires a manual browser step to enable this; there's no API path with a
repo-scoped token. In the repo:

1. **Settings → Branches → Add branch protection rule** (or edit the `main` rule).
2. Branch name pattern: `main`
3. Check **Require a pull request before merging** (and optionally **Dismiss stale
   pull request approvals**).
4. Check **Require status checks to pass before merging** and select the
   **`Build & test`** check.
5. Optionally **Require signed commits** / **Require linear history**.
6. Save.

## Repository hygiene

- `output/`, `cache/`, `.doit.db*`, `tests/node_modules/` are git-ignored — the repo
  holds **source only**; generated files are produced by CI.
- Never commit credentials. The FTP deploy target lives in a git-ignored
  `deploy_target.conf`; see `conf.py`.
- Keep PRs small and focused so they are easy to review and CI runs quickly.