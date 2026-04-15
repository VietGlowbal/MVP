import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: file.originalname,
      Body: file.buffer,
    });

    await s3.send(command);

    res.json({ message: "Upload successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running"));
