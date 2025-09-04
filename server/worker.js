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
      const textSplitter = new CharacterTextSplitter({
        separator: "\n",
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      
      const docs = await textSplitter.splitDocuments(rawDocs);
      console.log(`Split into ${docs.length} chunks`);

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
      await vectorStore.addDocuments(docs);
      console.log("all docs added to vector store");
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
