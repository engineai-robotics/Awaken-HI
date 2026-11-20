# Visitor statistics on GitHub Pages

GitHub Pages serves `docs/` as static files. Run `preview/project.py` on a server behind HTTPS to provide live visitor statistics. Keep the directory set by `ENGINE_HI_STATE` on persistent storage so counts survive redeployment.

Set `AWAKEN_VISIT_ORIGINS` on the API server to the Pages origin, such as `https://engineai-robotics.github.io`. If a reverse proxy forwards the real client address in `X-Forwarded-For`, set `ENGINE_HI_TRUSTED_PROXIES` to the actual proxy addresses or CIDRs. Requests with private client addresses still count toward total views.

Replace the contents of `docs/api/visits.json` with the public API URL before publishing the Pages files.

```json
{"endpoint":"https://your-api-host.example/api/visits.json"}
```

That endpoint accepts `GET` for totals and `POST` for recording a view. The checked-in `{"live":false}` response is used until an endpoint is configured. When previewing through `project.py`, the same relative path serves live data from the local SQLite database.
