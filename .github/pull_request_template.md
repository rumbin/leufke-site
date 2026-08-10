## Summary

<!-- What does this change do, and why? One or two sentences. -->

## Motivation

<!-- Which problem does this solve? Link an issue if there is one. -->

## Type of change

- [ ] Content / copy change (page text, photos, links)
- [ ] Bug fix (e.g. carousel layout, broken link)
- [ ] Tooling / CI / build change
- [ ] Theme / design change
- [ ] Dependency / framework upgrade
- [ ] Other (describe)

## Checklist

Before merging, CI must pass (`Build & test` job — build + carousel + link checks).
The site is deployed automatically to GitHub Pages when this merges to `main`; it is your responsibility that `main` stays green.

- [ ] Ran `nikola build` locally with no errors (or CI proves it)
- [ ] Ran `node tests/carousel-heights.test.js` and `node tests/check-links.test.js` (or CI proves them)
- [ ] No sensitive data / credentials are introduced
- [ ] Tested the change at a desktop viewport (and mobile if relevant)

## Test plan

<!-- What did you do to verify this works? Be concrete. -->