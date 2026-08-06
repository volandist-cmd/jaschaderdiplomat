# Dev server: always-on via launchd

The Vite dev server runs as a macOS LaunchAgent, not a plain terminal process — it survives terminal closures, crashes, and restarts automatically on login. Set up 2026-08-06 after repeated "localhost doesn't work" issues caused by an orphaned process left over from a manual `npm run dev &`.

**Always at:** http://localhost:5173/ (`vite.config.ts` pins `server.port: 5173` + `strictPort: true` so it never silently drifts to 5174/5175 on restart).

## Files
- `~/Library/LaunchAgents/com.jaschaderdiplomat.devserver.plist` — the launchd job (`RunAtLoad` + `KeepAlive: true`, so it starts on login and restarts on crash within ~5s)
- `~/.local/bin/jaschaderdiplomat-devserver.sh` — wrapper script launchd actually runs. Exists because launchd's default environment is `PATH=/usr/bin:/bin:/usr/sbin:/sbin` only (no `/usr/local/bin`, where `node`/`npm` live) — the script sets a normal PATH before calling `npm run dev`.
- Logs: `~/Library/Logs/jaschaderdiplomat-devserver.log` (stdout) and `.err.log` (stderr) — check here first if the server seems down.

## Managing it
```bash
# status
launchctl list | grep jaschaderdiplomat

# stop
launchctl bootout gui/$(id -u)/com.jaschaderdiplomat.devserver

# start (after a stop, or after editing the plist)
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.jaschaderdiplomat.devserver.plist

# tail logs
tail -f ~/Library/Logs/jaschaderdiplomat-devserver.log
```

**Don't** also run `npm run dev` manually in a terminal while this is active — it'll fail immediately with `Port 5173 is already in use` (by design, `strictPort: true`), or worse, if you kill your manual one incompletely (background job control doesn't survive across separate shell sessions), it can orphan a process that squats on the port and blocks the supervised one from ever rebinding — exactly what caused the original problem this setup fixes.
