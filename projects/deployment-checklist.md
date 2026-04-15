# Glowbal deployment checklist

## Service ownership
- Frontend: GitHub Pages
- Mail relay: Render (`mail-relay/`)
- Upload API: Render (`api/`)
- File storage: AWS S3

## Frontend
- Configure `VITE_SIGNUP_API_URL`
- Configure `VITE_UPLOAD_API_URL`
- Confirm GitHub Pages build succeeds

## Mail relay
- Deploy `mail-relay/` on Render
- Set SMTP credentials
- Verify `GET /health`
- Verify `POST /api/signup`

## Upload API
- Deploy `api/` on Render
- Set AWS credentials and bucket env vars
- Set `FRONTEND_ORIGIN`
- Verify `GET /health`
- Verify `POST /upload`

## AWS S3
- Confirm target bucket exists
- Confirm region matches app config
- Confirm IAM credentials can upload objects to bucket

## Final checks
- Upload a CV from frontend
- Confirm object appears in S3
- Confirm signup flow still works
- Confirm frontend behavior is graceful if upload API is unavailable
