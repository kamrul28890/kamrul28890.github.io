# World Cup Atlas 2026

Source application for `https://kamrul28890.github.io/wc2026/`.

## Commands

- `npm run dev` — start the source application.
- `npm run data:update` — refresh the bundled fallback snapshot.
- `npm run build` — compile the production site into `../wc2026`.
- `npm run release` — refresh data and build the production site.
- `npm run lint` — run the source linter.

## Data design

The browser requests the provisional community live feed once per minute. If that request fails, it uses the bundled JSON snapshot in `public/data`.

All rendering code consumes the local `TournamentData` model rather than provider-specific UI components. This keeps the frontend replaceable when the production Cloudflare Worker and licensed provider adapter are added.

The generated `../wc2026` folder is committed because the personal site deploys directly from the repository root through GitHub Pages.
