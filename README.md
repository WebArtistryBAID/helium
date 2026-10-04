<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/assets/helium-lockup-dark.svg">
  <img src="public/assets/helium-lockup-light.svg" alt="Helium" width="360">
</picture>

<br>

BAID's website. Built with Next.js.

<br>

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-required-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)

[Overview](#overview) · [Development](#development) · [Environment Variables](#environment-variables) · [Contribution](#contribution) · [License](#license)

</div>



Helium is the new content management system for the website of Beijing Academy International Division (BAID) and the
International School of Beijing Academy (ISBA).

Helium is based on [BAID-CSClub](https://github.com/BAID-CSClub)/[**baid-website-next**](https://github.com/BAID-CSClub/baid-website-next) by [@lihe07](https://github.com/lihe07) and [@lemonadedw](https://github.com/lemonadedw).
It was originally developed by Lin Donglai and is now maintained by WebArtistry @BAID.

## Overview

* Everything that is displayed on the website for visitors is a `ContentEntity`. A `ContentEntity` includes the title,
  content, cover images, and other metadata for something that is displayed on the website.
    * Each metadata type in a `ContentEntity` corresponds to four fields: a Chinese draft field, an English draft field,
      a Chinese published field, and an English published field.
    * The draft fields are what the editors for the website change, while the published fields are what is displayed on
      the website for visitors.
    * To publish the draft fields to the published fields—a process known as "alignment"—a series of approvals must be
      completed by a specified number of editors and admins, as defined by `ApprovalConfig` objects.
    * There are 7 types of `ContentEntity` objects, as defined in the enum `EntityType`: `post`, `page`, `club`,
      `activity`, `project`, `course`, and `faculty`. Each `EntityType` is displayed differently on the frontend. Most
      notably, the `page` `EntityType` is displayed completely differently from the other `ContentEntity` types, as it
      is completely customizable using a WYSIWYG Puck editor, with pre-defined, customizable components in
      `src/app/lib/puck/components` for editors to use. The other `EntityType` types all follow a fixed template, with
      limited customization supported by the Plate editor.
* While `ContentEntity` objects are the core of Helium, it includes many other amazing features that greatly simplify
  the website management process.
    * **Integrated MCP server.** Helium can be added to your agent of choice to automate all your workflows exactly the
      way you want it.
    * **AI-powered content importing.** Helium supports importing content from WeChat Official Accounts, automatically
      creating `post` type `ContentEntity` objects from them. This feature automatically translates the Chinese content
      to English and sanitizes the content to remove formatting artifacts using AI models provided by Feishu Aily (which
      the school pays for).
    * **Live collaboration.** Live, synchronized editing is supported for both the Plate and Puck editors using Y.js and
      Hocuspocus.
    * **Feishu notifications.** Helium can send approval notifications and publication notifications to appropriate
      users with Feishu integration.
    * **Comments and suggestions.** Commenting and suggestions are available to mark content for review before
      publishing.
    * **Portal integration.** By using [LinkBAID](https://github.com/WebArtistryBAID/baid-onelogin), Helium supports
      logging in with [Seiue LMS](https://bjzxgjb.seiue.com) and [Feishu](https://beijingacademy.feishu.cn) accounts.
    * **Asset optimization.** Images are automatically optimized and converted to WebP format when they are uploaded.
    * **Automated backups.** All `ContentEntity` objects are periodically backed up to a ZIP file, which can be
      downloaded and restored by admins.

## Development

To run in development:

1. Copy `.env.example` to `.env`.
2. Install Node.js, npm, and FFmpeg. Ensure that FFmpeg is available on `PATH`, or set `FFMPEG_PATH`.
3. Run `npm install`.
4. Set up a PostgreSQL database and set the `DATABASE_URI` environment variable in `.env`.
5. Run `prisma db push` to create the database schema.
6. Run `prisma generate` to generate the Prisma client.
7. Run [decorative-image-classifier](https://github.com/WebArtistryBAID/decorative-image-classifier) concurrently to
   support WeChat content imports. This external service automatically removes decorative images from WeChat posts to
   enable easier editing. (This isn't strictly necessary.)
8. Gain access to the production Feishu Aily app and Feishu notification apps by asking your school point of contact.
   (This isn't strictly necessary.)
9. Run a development server of [LinkBAID](https://github.com/WebArtistryBAID/baid-onelogin) to support authentication or
   use the official LinkBAID server by informing your school point of contact.
10. Fill the remaining environment variables.
11. Run `npm run dev` to start the development server.

## Production

To run in production:

1. Copy `.env.example` to `.env`.
2. Install Node.js, npm, and FFmpeg. Ensure that FFmpeg is available on `PATH`, or set `FFMPEG_PATH`.
3. Run `npm install`.
4. Set up a PostgreSQL database and set the `DATABASE_URI` environment variable in `.env`.
5. Run `prisma db push` to create the database schema.
6. Run `prisma generate` to generate the Prisma client.
7. Run [decorative-image-classifier](https://github.com/WebArtistryBAID/decorative-image-classifier) in the background.
   You can use `pm2` or `tmux` to run it.
8. Gain access to the production LinkBAID server, Feishu Aily app, and Feishu notification apps.
    * **LinkBAID server**: You must create a LinkBAID application with the following scopes: `basic`, `phone`, and
      `sms`. This app must be approved before continuing.
    * **Notification app**: You will need to create an app on Feishu Open Platform with the following scopes:
      `im:message`, `im:message:send_as_bot`. You must set the redirect URL to include
      `${HOST}/studio/settings/feishu/callback`.
    * **Aily app**: You must create an enterprise agent on Feishu Aily Development Platform, **not** Feishu Open
      Platform. In the Feishu Aily Development Platform, enable tenant access in "access methods." You do not have to
      set up any prompts for this agent. Then return to the Feishu Open Platform and enable the following scopes:
      `aily:agent_artifact:read`, `aily:agent_attachment:write`, `aily:agent_chat:read`, `aily:agent_chat:write`,
      `aily:agent_visibility:read`, `aily:data_asset:read`, `aily:data_asset:upload_file`, `aily:data_asset:write`,
      `aily:file:read`.
9. Set up a cron task that triggers `curl -fsS "https://example.com/api/backups/daily?key=$CRON_KEY"` for automatic
   backups. Use the same `CRON_KEY` that you set in the environment variables.
10. Fill the remaining environment variables.
11. Run `npm run build` to build the production server.
12. Using `pm2`, run `pm2 start npm --name helium -- run start` to start the production server. You can also use
    `pm2 save` to save the process list and `pm2 startup` to configure it to start on boot.
13. Helium runs on port 52323 by default, and the Hocuspocus collaboration server runs on port 1234 by default.
14. Create a reverse proxy with Nginx as appropriate such that Nginx handles HTTPS and serves static files. An example
    Nginx configuration is shown below.

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/helium;
    
    # Security headers for app responses are set by Helium itself (next.config.ts).
    client_max_body_size 250M;  # Must cover the 250 MB video upload limit
    
    location ^~ /uploads/ {
        alias /home/web/helium-baid/uploads/;  # By setting up Nginx to serve files from /uploads/, we must set `UPLOAD_SERVE_PATH` to `/uploads` (users access uploaded files on `https://.../uploads/...`) and `UPLOAD_PATH` to `uploads` (uploaded files are saved to `/var/www/helium/uploads/`).
        autoindex off;
        add_header X-Content-Type-Options "nosniff" always;
        try_files $uri =404;
    }

    location ^~ /collaboration {  # No trailing slash!
        proxy_pass http://127.0.0.1:1234/;  # Match your Hocuspocus port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://localhost:52323/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $http_host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
    }
}
```

## Environment Variables

| Name                         | Description                                                                                                                                                                                                                             |
|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `DATABASE_URI`               | The database URI to use. PostgreSQL is required.                                                                                                                                                                                        |
| `HOST`                       | The absolute URL where Helium is hosted. No trailing slashes. For example, `http://localhost:3000` in development or `https://baid.beijingacademy.com.cn` in production.                                                                |
| `UPLOAD_PATH`                | The directory where uploaded files are stored. In development, use `public/uploads` to have the Next.js development server serve uploaded files.                                                                                        |
| `UPLOAD_SERVE_PATH`          | The relative URL where uploaded files are served. In development, this is `uploads`.                                                                                                                                                    |
| `BACKUP_PATH`                | Directory for content backups. Defaults to `backups` in the working directory. Must not be inside `UPLOAD_PATH` or any other publicly served directory, because backups include unpublished drafts.                                     |
| `ONELOGIN_HOST`              | The location where [OneLogin](https://github.com/WebArtistryBAID/baid-onelogin) is hosted. No trailing slashes.                                                                                                                         |
| `ONELOGIN_CLIENT_ID`         | OneLogin client ID. `basic`, `phone`, and `sms` scopes are required.                                                                                                                                                                    |
| `ONELOGIN_CLIENT_SECRET`     | OneLogin client secret.                                                                                                                                                                                                                 |
| `JWT_SECRET`                 | The JWT secret key to use. You can generate one with `openssl rand -hex 32`.                                                                                                                                                            |
| `FFMPEG_PATH`                | Optional path to the FFmpeg executable used to generate video thumbnails. Defaults to `ffmpeg` on `PATH`.                                                                                                                               |
| `CRON_KEY`                   | Secret key required by cron-only API endpoints. Generate one with `openssl rand -hex 32`.                                                                                                                                               |
| `FEISHU_CLIENT_ID`           | Feishu app used for approval notifications. Starts with `cli_`.                                                                                                                                                                         |
| `FEISHU_CLIENT_SECRET`       | Feishu app used for approval notifications.                                                                                                                                                                                             |
| `FEISHU_AI_CLIENT_ID`        | Another Feishu app used for translating and sanitizing WeChat imports. Starts with `cli_`.                                                                                                                                              |
| `FEISHU_AI_CLIENT_SECRET`    | Another Feishu app used for translating and sanitizing WeChat imports.                                                                                                                                                                  |
| `FEISHU_AILY_AGENT_ID`       | Another Feishu app used for translating and sanitizing WeChat imports. You must create an agent and paste the agent ID here. Starts with `agent_`. It's in the browser address bar.                                                     |
| `NEXT_PORT`                  | Port used by the production Next.js server. Defaults to `52323`.                                                                                                                                                                        |
| `HOCUSPOCUS_PORT`            | Local port for the Plate collaboration server. Defaults to `1234`.                                                                                                                                                                      |
| `HOCUSPOCUS_INTERNAL_URL`    | Server-only HTTP base URL for MCP editor requests to Hocuspocus, such as `http://127.0.0.1:1234`. Set this to bypass the reverse proxy if you set up one in production. If omitted, requests fall back to `NEXT_PUBLIC_HOCUSPOCUS_URL`. |
| `NEXT_PUBLIC_HOCUSPOCUS_URL` | Browser WebSocket URL for Plate collaboration, such as `ws://192.168.1.20/collaboration/`. Set this before running `npm run build`.                                                                                                     |
| `SERVER_ACTIONS_ALLOWED_ORIGINS`| Comma-separated hosts (e.g. `example.com,10.0.0.5:8523`) allowed to call server actions when the browser origin differs from the `Host` header, such as behind a reverse proxy. Defaults to the BAID production hosts. Set this before running `npm run build`.|

## Contribution

Contribution is accepted from Beijing Academy students. All contributions are owned by Beijing Academy.

## License

All rights reserved unless otherwise stated. Refer to `LICENSE` for details.

"Beijing Academy," "BAID," "Better Me, Better World," and the Beijing Academy logo are legally protected and may not be
used without official authorization.


<br>

<div align="center">
  <img src="docs/assets/helium-icon.svg" alt="" width="40">
</div>
