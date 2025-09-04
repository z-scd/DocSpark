import express from "express";
import cors from "cors";
import multer from "multer";
import "dotenv/config";

import { Queue } from "bullmq";
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogle } from "@langchain/google-gauth";

const PORT = 8000;
const app = express();
const queue = new Queue("file-upload-queue", {
  connection: {
    host: "localhost",
    port: "6379",
  },
});

const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    cb(null, "upload/");
  },
  filename: (req, file, cb) => {
    const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniquePrefix}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

app.use(cors());

app.get("/", (req, res) => {
  return res.json({ status: "All Good" });
});

app.post("/upload/pdf", upload.single("pdf"), async (req, res) => {
  await queue.add(
    "file-ready",
    JSON.stringify({
      fileName: req.file.originalname,
      destination: req.file.destination,
      path: req.file.path,
    })
  );
  return res.json({ status: "Uploaded" });
});

app.get("/chat", async (req, res) => {
  const userQuery = req.query.message;
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY, // Or pass your key directly
    model: "embedding-001", // Optional, default is "embedding-001"
  });
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL,
      collectionName: "pdf-docs",
    }
  );
  const ret = vectorStore.asRetriever({ k: 2 });
  const result = await ret.invoke(userQuery);

  const systemPrompt = `
  Act as a supportive AI agent who helps answering questions from following context,
  Context : ${JSON.stringify(result)}
  `;

  const model = new ChatGoogle({
    model: "gemma-3-27b-it",
  });

  const chatResult = await model.invoke([
    {
      role: "user",
      content: systemPrompt,
    },
  ]);

  return res.json({ chatResult });
});

app.listen(PORT, () => {
  console.log(`Port = ${PORT}`);
});
