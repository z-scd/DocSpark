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
  try {
    const userQuery = req.query.message;

    if (
      !userQuery ||
      typeof userQuery !== "string" ||
      userQuery.trim().length === 0
    ) {
      return res.status(400).json({ error: "Invalid or empty query" });
    }

    // Clean the query text
    const cleanQuery = userQuery
      .trim()
      .replace(/\0/g, "") // Remove null bytes
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ""); // Remove control characters

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "embedding-001",
      stripNewLines: true, // Add this to handle newlines
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL,
        collectionName: "pdf-docs",
      }
    );

    const ret = vectorStore.asRetriever({ k: 2 });
    const result = await ret.invoke(cleanQuery);

    const systemPrompt = `
    Act as a supportive AI agent who helps answering questions from following context,
    Context : ${JSON.stringify(result)}
    Question: ${cleanQuery}
    `;

    const model = new ChatGoogle({
      model: "gemma-3-27b-it",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const chatResult = await model.invoke([
      {
        role: "system",
        content:
          "You are a helpful AI assistant that answers questions based on the provided context.",
      },
      {
        role: "user",
        content: systemPrompt,
      },
    ]);

    return res.json({
      message: chatResult,
      docs: result,
    });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return res.status(500).json({
      error: "An error occurred while processing your request",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Port = ${PORT}`);
});
