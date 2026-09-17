# Helium

BAID's website. Built with Next.js.

## Get Started

To run in production:

* Using `pm2` allows for proper deployment in production.
* Remember to set the environment variables.
* Install FFmpeg so uploaded videos can receive WebP preview thumbnails.
* Run [decorative-image-classifier](https://github.com/WebArtistryBAID/decorative-image-classifier).

To run in development:

* Ensure that you have node.js and npm available.
* Ensure that FFmpeg is available on `PATH`, or set `FFMPEG_PATH`.
* Run `npm install`.
* Copy `.env.example` to `.env` and fill the environment variables.
* Run `npm run dev`.
* Run [decorative-image-classifier](https://github.com/WebArtistryBAID/decorative-image-classifier).

## Environment Variables

| Name                         | Description                                                                                                                                                                         |
|------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `DATABASE_URI`               | The database URI to use. PostgreSQL is required.                                                                                                                                    |
| `JWT_SECRET`                 | The JWT secret key to use. You can generate one with `openssl rand -hex 32`.                                                                                                        |
| `HOST`                       | The location where this service is hosted. No trailing slashes.                                                                                                                     |
| `UPLOAD_PATH`                | The directory where uploaded files are stored. In development, this is `public/uploads`.                                                                                            |
| `UPLOAD_SERVE_PATH`          | The path where uploaded files are served. In development, this is `uploads`.                                                                                                        |
| `FFMPEG_PATH`                | Optional path to the FFmpeg executable used to generate video thumbnails. Defaults to `ffmpeg` on `PATH`.                                                                           |
| `CRON_KEY`                   | Secret key required by cron-only API endpoints. Generate one with `openssl rand -hex 32`.                                                                                           |
| `ONELOGIN_HOST`              | The location where [OneLogin](https://github.com/WebArtistryBAID/baid-onelogin) is hosted. No trailing slashes.                                                                     |
| `ONELOGIN_CLIENT_ID`         | OneLogin client ID. `basic`, `phone`, and `sms` scopes are required.                                                                                                                |
| `ONELOGIN_CLIENT_SECRET`     | OneLogin client secret.                                                                                                                                                             |
| `FEISHU_CLIENT_ID`           | Feishu app used for approval notifications. Starts with `cli_`.                                                                                                                     |
| `FEISHU_CLIENT_SECRET`       | Feishu app used for approval notifications.                                                                                                                                         |
| `FEISHU_AI_CLIENT_ID`        | Another Feishu app used for translating and sanitizing WeChat imports. Starts with `cli_`.                                                                                          |
| `FEISHU_AI_CLIENT_SECRET`    | Another Feishu app used for translating and sanitizing WeChat imports.                                                                                                              |
| `FEISHU_AILY_AGENT_ID`       | Another Feishu app used for translating and sanitizing WeChat imports. You must create an agent and paste the agent ID here. Starts with `agent_`. It's in the browser address bar. |
| `NEXT_PORT`                  | Port used by the production Next.js server. Defaults to `52323`.                                                                                                                    |
| `HOCUSPOCUS_PORT`            | Local port for the Plate collaboration server. Defaults to `1234`.                                                                                                                  |
| `NEXT_PUBLIC_HOCUSPOCUS_URL` | Browser WebSocket URL for Plate collaboration, such as `ws://192.168.1.20/collaboration/`. Set this before running `npm run build`.                                                 |

## Plate collaboration

`npm run start` launches Next.js and Hocuspocus together. Apply
`prisma/manual/2026-09-16-yjs-documents.sql` to PostgreSQL before starting the collaboration server.

Keep Hocuspocus bound to `127.0.0.1` and proxy its WebSocket endpoint through Nginx:

```nginx
location /collaboration/ {
    proxy_pass http://127.0.0.1:1234/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_buffering off;
}
```

## Backups

Admins can create, download, and restore content entity backups from `/studio/backups`.

Backups are ZIP files stored in `UPLOAD_PATH/backups`. Each ZIP contains one JSON file per content entity with the
content fields required for restore. The restore operation replaces all current content entities with the selected
backup's content entities.

Automatic backups are triggered through an authenticated endpoint. Set `CRON_KEY`, then ask the sysadmin to run a daily
cron task such as:

```bash
curl -fsS "https://example.com/api/backups/daily?key=$CRON_KEY"
```

The endpoint creates at most one automatic backup per UTC day and prunes backups older than 5 days.

## Contribution

Contribution is accepted from Beijing Academy students. All contributions are owned by Beijing Academy.

## License

All rights reserved unless otherwise stated. Refer to `LICENSE` for details.

"Beijing Academy," "BAID," "Better Me, Better World," and the Beijing Academy logo are legally protected and may not be
used without official authorization.
