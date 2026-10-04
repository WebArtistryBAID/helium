<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/helium-lockup-dark.svg">
  <img src="docs/assets/helium-lockup-light.svg" alt="Helium" width="360">
</picture>

<br>

**The website of Beijing Academy (BAID).**

<br>

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-required-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)

[Get Started](#-get-started) · [Pages](#-expected-pages) · [Environment Variables](#-environment-variables) · [Contribution](#-contribution) · [License](#-license)

</div>

<br>

## 🚀 Get Started

### Development

> [!NOTE]
> You need Node.js and npm, plus a PostgreSQL database.

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file, then fill in the values
cp .env.example .env

# 3. Start the dev server
npm run dev
```

Also run [decorative-image-classifier](https://github.com/WebArtistryBAID/decorative-image-classifier) alongside it.

### Production

```bash
npm run build
npm run start   # serves on port 52323
```

* Use [`pm2`](https://pm2.keymetrics.io) for proper process management in production.
* Remember to set the [environment variables](#-environment-variables).
* Run [decorative-image-classifier](https://github.com/WebArtistryBAID/decorative-image-classifier).

## 🗺️ Expected Pages

| Route         | Description |
|---------------|-------------|
| `/`           | Home        |
| `/about`      | About       |
| `/academics`  | Academics   |
| `/life`       | Life        |
| `/projects`   | Projects    |
| `/admissions` | Admissions  |
| `/news`       | News        |

Content entities are shown at `/content/yyyy/MM/dd/slug`.

> [!TIP]
> Certain pages have hardcoded constants associated with them; for example, header transparency.

## 🔐 Environment Variables

Copy `.env.example` to `.env` and fill in the following:

| Name                     | Description                                                                                                     |
|--------------------------|-----------------------------------------------------------------------------------------------------------------|
| `DATABASE_URI`           | The database URI to use. PostgreSQL is required.                                                                |
| `JWT_SECRET`             | The JWT secret key to use. You can generate one with `openssl rand -hex 32`.                                    |
| `HOST`                   | The location where this service is hosted. No trailing slashes.                                                 |
| `UPLOAD_PATH`            | The directory where uploaded files are stored. In development, this is `public/uploads`.                        |
| `UPLOAD_SERVE_PATH`      | The path where uploaded files are served. In development, this is `uploads`.                                    |
| `BOTTOM_TEXT`            | In case you need this.                                                                                          |
| `ONELOGIN_HOST`          | The location where [OneLogin](https://github.com/WebArtistryBAID/baid-onelogin) is hosted. No trailing slashes. |
| `ONELOGIN_CLIENT_ID`     | OneLogin client ID. `basic`, `phone`, and `sms` scopes are required.                                            |
| `ONELOGIN_CLIENT_SECRET` | OneLogin client secret.                                                                                         |
| `DEEPSEEK_API_KEY`       | Used for sanitizing articles automatically.                                                                     |
| `FEISHU_CLIENT_ID`       | Feishu app ID used for account binding and approval notifications.                                              |
| `FEISHU_CLIENT_SECRET`   | Feishu app secret used for account binding and approval notifications.                                          |

## 🤝 Contribution

Contribution is accepted from Beijing Academy students. All contributions are owned by Beijing Academy.

## 📄 License

All rights reserved unless otherwise stated. Refer to [`LICENSE`](LICENSE) for details.

> [!IMPORTANT]
> "Beijing Academy," "BAID," "Better Me, Better World," and the Beijing Academy logo are legally protected and may not be
> used without official authorization.

<br>

<div align="center">
  <img src="docs/assets/helium-icon.svg" alt="" width="40">
</div>
