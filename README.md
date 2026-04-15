# Helium

BAID's website. Built with Next.js.

## Get Started

To run in production:

* Using `pm2` allows for proper deployment in production.
* Remember to set the environment variables.
* Run [decorative-image-classifier](https://github.com/WebArtistryBAID/decorative-image-classifier).

To run in development:

* Ensure that you have node.js and npm available.
* Run `npm install`.
* Copy `.env.example` to `.env` and fill the environment variables.
* Run `npm run dev`.
* Run [decorative-image-classifier](https://github.com/WebArtistryBAID/decorative-image-classifier).

## Expected Pages

* `/`
* `/about`
* `/academics`
* `/life`
* `/projects`
* `/admissions`
* `/news`

Certain pages have hardcoded constants associated with them; for example, header transparency.

`/content/yyyy/MM/dd/slug` is used for showing details of content entities.

## Environment Variables

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

## Contribution

Contribution is accepted from Beijing Academy students. All contributions are owned by Beijing Academy.

## License

All rights reserved unless otherwise stated. Refer to `LICENSE` for details.

## Content Editor

Content entities (club, course, activity, project, faculty, post) use the **Puck visual editor**, the same as pages. Content is stored as Puck JSON in `contentDraftEN` / `contentPublishedEN` (and ZH equivalents). The public render uses `<Render config={PUCK_CONFIG} data={...} />`.

New Puck components available in the "内容详情" category: Timeline, ContactCard, LeadershipGrid, Syllabus, InstructorCard, LocationCard, TeamGrid, StatBlock, FAQAccordion, VideoEmbed, ImageGalleryBlock, QuoteBlock, CTAButton.

"Beijing Academy," "BAID," "Better Me, Better World," and the Beijing Academy logo are legally protected and may not be
used without official authorization.
