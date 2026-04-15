# Glowbal

Glowbal shortlist creator + lead capture funnel.

## Recommended deployment architecture

### Frontend
- Host the Vite frontend on GitHub Pages

### Mail relay
- Host `mail-relay/` on Render
- Handles landing signups, welcome emails, and admin lead access

### Upload API
- Host `api/` on Render
- Stores uploaded CV files in AWS S3

### AWS
- Use S3 for uploaded file storage

## Frontend environment variables
Set these in the frontend deploy or local `.env`:

- `VITE_SIGNUP_API_URL=https://<your-render-mail-relay>.onrender.com/api/signup`
- `VITE_UPLOAD_API_URL=https://<your-render-upload-api>.onrender.com/upload`

## Mail relay
See `mail-relay/README.md` for Render deploy and SMTP env setup.

## Upload API
See `api/README.md` for Render and AWS S3 setup.
