import { Worker } from "bullmq";
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";

const worker = new Worker(
  "file-upload-queue",
  async (job) => {
    try {
      console.log("Worker received a job");
      console.log(`Job data: ${job.data}`);
      const data = JSON.parse(job.data);
      const loader = new PDFLoader(data.path);
      const rawDocs = await loader.load();

      // Split text into chunks
      // Process and validate each document
      const validDocs = rawDocs
        .filter((doc) => {
          if (!doc.pageContent || typeof doc.pageContent !== "string") {
            console.warn("Found invalid document, skipping:", doc);
            return false;
          }
          return true;
        })
        .map((doc) => ({
          ...doc,
          pageContent: doc.pageContent
            .replace(/\0/g, "") // Remove null bytes
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove control characters
            .trim(),
        }));

      if (validDocs.length === 0) {
        throw new Error("No valid text content found in PDF");
      }

      const textSplitter = new CharacterTextSplitter({
        separator: "\n",
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const docs = await textSplitter.splitDocuments(validDocs);
      console.log(`Split into ${docs.length} chunks`);

      // Validate chunks
      const validChunks = docs.filter((doc) => {
        if (!doc.pageContent || doc.pageContent.trim().length === 0) {
          console.warn("Found empty chunk, skipping");
          return false;
        }
        return true;
      });

      if (validChunks.length === 0) {
        throw new Error("No valid chunks found after splitting");
      }

      console.log(`Processing ${validChunks.length} valid chunks`);

      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        model: "embedding-001",
      });

      const client = new QdrantClient({ url: process.env.QDRANT_URL });

      // Check if collection exists, if not create it
      try {
        await client.getCollection("pdf-docs");
      } catch (e) {
        // Collection doesn't exist, create it
        await client.createCollection("pdf-docs", {
          vectors: {
            size: 768,
            distance: "Cosine",
          },
        });
      }

      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          url: process.env.QDRANT_URL,
          collectionName: "pdf-docs",
        }
      );
      // Add documents in smaller batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < validChunks.length; i += batchSize) {
        const batch = validChunks.slice(i, i + batchSize);
        await vectorStore.addDocuments(batch);
        console.log(
          `Processed batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(
            validChunks.length / batchSize
          )}`
        );
      }
      console.log("All documents successfully added to vector store");
    } catch (error) {
      console.error("Error processing document:", error);
      throw error; // Re-throw to mark the job as failed
    }
  },
  {
    concurrency: 100,
    connection: "redis://localhost:6379",
  }
);

worker.on("failed", (job, err) => {
  console.error(`Job failed: ${err.message}`);
});

worker.on("completed", (job) => {
  console.log(`Job completed: ${job.id}`);
});

console.log("Worker started and waiting for jobs...");
