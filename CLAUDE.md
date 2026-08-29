# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Genshin Random GoGo Kaboom is a Genshin Impact-themed randomizer for a small friend group: each friend picks their name, marks which characters they own, then spins a wheel to randomly land on one of their owned characters (or on a boss from the full game boss list).

It's a static, client-side-only site — plain HTML/CSS/vanilla JS, no build tooling, no package manager, no bundler. Pages are opened directly or served as static files (e.g. GitHub Pages). The only network dependency beyond CDNs is Supabase, used purely as a hosted Postgres database via its JS client — there is no app server.

## Commands

There is no build, lint, or test command. To develop:
- Serve the directory with any static file server (e.g. `python -m http.server`) and open pages via `http://localhost:<port>/...`. Opening files directly via `file://` mostly works too, but `fetch()` calls (used to load `data/*.json`) can hit CORS restrictions in some browsers under `file://`, so prefer a local server.
- Verify changes by clicking through the flow in a real browser: `player.html` → `edit_char.html` → `random_game.html`.

## Architecture

### Page flow
`index.html` → `player.html` (pick or add a friend) → `edit_char.html` (mark owned characters) and/or `random_game.html` (spin the wheel). The selected player is passed between pages via `localStorage` (`player_id`, `player_name`) rather than URL params — every page past `player.html` reads these keys and redirects back to `player.html` if they're missing.

### Data split: static reference data vs. Supabase
- `data/characters.json` and `data/bosses.json` are static, bundled game reference data (all playable characters / all bosses). They don't change per user, so they're plain JSON fetched client-side — not stored in the DB.
- Supabase (Postgres) holds only the dynamic, shared state: the `players` table (friend names) and `player_characters` (which character IDs each player owns, referencing the `id` slugs in `data/characters.json`). There is no auth — anyone can add a player or edit any player's roster (RLS policies are wide open by design, since this is for a small trusted friend group, not a public product).
- `js/supabase-config.js` holds the Supabase project URL + anon key and sets `window.supabaseClient` and `window.supabaseConfigured`. Every page-specific script checks `window.supabaseConfigured` before making Supabase calls and degrades gracefully if it's false (e.g. `random-game.js` falls back to randomizing the full character list instead of an owned-only list; `showSupabaseWarning()` renders a banner). When adding a new page that touches the DB, include the Supabase CDN script tag and `js/supabase-config.js` before your page's own script, in that order — see any of the existing `<script>` blocks at the bottom of `player.html`/`edit_char.html`/`random_game.html`.

### The wheel (`js/random-game.js`)
The wheel is a `<canvas>` drawn once (colored wedges + labels, skipped for very large pools to stay legible) and spun by animating a CSS `transform: rotate()` on the canvas element — it is not redrawn during the spin. The rotation math picks a winning index first, then computes the exact final angle needed to land that wedge under the fixed pointer (top of the wheel), adding several full extra rotations for visual effect. If you change the wheel's geometry (canvas size, wedge start angle offset, pointer position), you must keep `drawWheel()`'s wedge angle convention and `spin()`'s target-angle math in sync — they assume wedge 0 starts at the pointer position.

### Known duplication
The `ELEMENT_COLORS` map (element → hex color, used for character card borders and wheel wedge colors) is duplicated in `js/edit-char.js` and `js/random-game.js`. Update both if you add/change an element color.

## Conventions to follow

- Every page includes: Bootstrap 5.0.2 via the same jsdelivr CDN link/integrity hash, the "Barlow" Google Font with the same preconnect links, and a stylesheet link to `style.css`. Match `index.html`'s `<head>` exactly when adding a new page.
- Reuse the existing navbar (royalblue background, aliceblue brand text, title "Genshin Random GoGo Kaboom") rather than inventing a new header per page.
- Character/boss `id` fields in the JSON data files are kebab-case slugs (e.g. `kamisato-ayaka`, `raiden-shogun`) and are the join key used against Supabase's `player_characters.character_id` — don't rename an existing slug without also accounting for already-stored rows.
- The character/boss lists in `data/*.json` reflect the model's knowledge cutoff and may be missing the newest patch's additions or have inaccuracies in recent boss names — treat them as a starting point to hand-edit, not an authoritative source.

## Deployment

Deployed via GitHub Pages serving `main` from the repo root. `.nojekyll` is present so Pages serves the static files as-is without Jekyll processing. Supabase calls require `http(s)://`, not `file://`, so the live Pages URL (or a local static server) is needed to fully exercise the app — plain `file://` won't work for the DB-backed features.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
