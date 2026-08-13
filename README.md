# HH Goa 2026 frame generator

Task 1 for [Hacker House Goa 2026](https://hhgoa.com/): upload a photo, get a branded graphic, download it, share on X with `#FrameInGoa`.

Formats:

- **PFP frame.** Square overlay around the photo, for an X profile picture.
- **Builder ID.** Photo, name, stack/role, generated builder class. Event badge, not a print card.
- **Team frame.** One to three photos in a shared graphic.

No login. JPG, PNG, and HEIC. Cover-crop handles any aspect ratio.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Share to X

Download is a PNG. Share to X uploads a copy so the tweet link can show the graphic as its preview (`/c/[id]` + `/api/cards/[id]`).

On phones that support Web Share, the PNG is attached directly. Otherwise the tweet composer opens with a caption that already includes `#FrameInGoa`.

For reliable previews on Vercel, link a Blob store so `BLOB_READ_WRITE_TOKEN` is set. Without it, cards live in `/tmp` on that instance.

Set `NEXT_PUBLIC_SITE_URL` to the public origin (no trailing slash) so Open Graph URLs are absolute.

## Submit

Live link + an X post that actually contains `#FrameInGoa`.

Form: https://forms.gle/jM5hTaGvsrfEfixPA
