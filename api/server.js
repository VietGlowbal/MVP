import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import cors from "cors";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const REQUIRED_ENV_VARS = ["AWS_REGION", "BUCKET_NAME"];
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_BYTES || 5 * 1024 * 1024);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".txt"]);

const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY;

if (!awsAccessKeyId) {
  REQUIRED_ENV_VARS.push("AWS_ACCESS_KEY_ID or AWS_ACCESS_KEY");
}
if (!awsSecretAccessKey) {
  REQUIRED_ENV_VARS.push("AWS_SECRET_ACCESS_KEY or AWS_SECRET_KEY");
}

const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => key.includes(" or ") ? false : !process.env[key]);
const missingAwsAliases = [];
if (!awsAccessKeyId) missingAwsAliases.push("AWS_ACCESS_KEY_ID or AWS_ACCESS_KEY");
if (!awsSecretAccessKey) missingAwsAliases.push("AWS_SECRET_ACCESS_KEY or AWS_SECRET_KEY");
const allMissingEnvVars = [...missingEnvVars, ...missingAwsAliases];

if (allMissingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${allMissingEnvVars.join(", ")}`);
  process.exit(1);
}

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  },
});

app.use(cors({
  origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN,
}));
app.use(express.json());

function sanitizeFilename(filename = "upload") {
  const ext = path.extname(filename).toLowerCase();
  const baseName = path.basename(filename, ext)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "upload";

  return { baseName, ext };
}

function isAllowedFile(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mimeAllowed = file.mimetype && ALLOWED_MIME_TYPES.has(file.mimetype);
  const extAllowed = ALLOWED_EXTENSIONS.has(ext);
  return mimeAllowed || extAllowed;
}

function buildObjectKey(file) {
  const { baseName, ext } = sanitizeFilename(file.originalname);
  const datePrefix = new Date().toISOString().slice(0, 10);
  const randomSuffix = crypto.randomUUID();
  return `uploads/${datePrefix}/${baseName}-${randomSuffix}${ext}`;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "glowbal-upload-api",
    bucket: process.env.BUCKET_NAME,
    region: process.env.AWS_REGION,
  });
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        ok: false,
        error: "No file uploaded",
      });
    }

    if (!isAllowedFile(file)) {
      return res.status(415).json({
        ok: false,
        error: "Unsupported file type. Allowed: pdf, doc, docx, txt",
      });
    }

    const key = buildObjectKey(file);

    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || "application/octet-stream",
    });

    await s3.send(command);

    return res.status(201).json({
      ok: true,
      message: "Upload successful",
      key,
      bucket: process.env.BUCKET_NAME,
    });
  } catch (error) {
    console.error("Upload failed", error);
    return res.status(500).json({
      ok: false,
      error: "Upload failed",
      detail: error.message,
    });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      ok: false,
      error: `File too large. Max size is ${MAX_FILE_SIZE_BYTES} bytes`,
    });
  }

  console.error("Unexpected server error", error);
  return res.status(500).json({ ok: false, error: "Unexpected server error" });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Glowbal upload API listening on port ${port}`);
});
