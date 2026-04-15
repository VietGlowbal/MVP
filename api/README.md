# Glowbal Upload API

Node/Express upload service for CV files.

## Purpose
This service accepts CV uploads from the Glowbal frontend and stores them in AWS S3.

Recommended deployment target:
- Render web service for `api/`
- AWS S3 for object storage

## Endpoints
- `GET /health`
- `POST /upload` with multipart form field `file`

## Render settings
Create a new Render Web Service with:
- Root Directory: `api`
- Build Command: `npm install`
- Start Command: `npm start`

## Required environment variables
- `AWS_REGION`
- `BUCKET_NAME`
- `AWS_ACCESS_KEY_ID` or `AWS_ACCESS_KEY`
- `AWS_SECRET_ACCESS_KEY` or `AWS_SECRET_KEY`

## Optional environment variables
- `FRONTEND_ORIGIN=https://<your-github-pages-site>`
- `MAX_FILE_SIZE_BYTES=5242880`
- `PORT` (Render usually provides this automatically)

## Allowed file types
- PDF
- DOC
- DOCX
- TXT

## Notes
- Prefer IAM credentials scoped only to the target S3 bucket
- Set `FRONTEND_ORIGIN` to your frontend origin for tighter CORS
- Uploaded files are stored under `uploads/YYYY-MM-DD/...`
