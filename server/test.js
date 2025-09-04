import { Queue } from "bullmq";

const queue = new Queue("file-upload-queue", {
  connection: "redis://localhost:6379",
});

async function addJob() {
  await queue.add(
    "pdf-process",
    JSON.stringify({
      path: "c:/Users/sagar/OneDrive/Desktop/pdf-rag/server/upload/1756999537695-384797268-Free_Test_Data_500KB_PDF.pdf",
    })
  );
  console.log("Job added to queue");
  process.exit(0);
}

addJob().catch(console.error);
