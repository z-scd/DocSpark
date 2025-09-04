# PDF RAG (Retrieval Augmented Generation)

This project implements a PDF document processing system with vector embeddings for semantic search capabilities. It consists of a client-server architecture where users can upload PDFs and perform semantic searches through their content.

## Project Structure

```
pdf-rag/
├── client/          # Next.js frontend
├── server/          # Node.js backend
└── docker-compose.yml  # Docker configuration
```

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- pnpm (Package Manager)

## Setup

1. Clone the repository:

```bash
git clone <your-repo-url>
cd pdf-rag
```

2. Install dependencies:

```bash
# Install server dependencies
cd server
pnpm install

# Install client dependencies
cd ../client
pnpm install
```

3. Set up environment variables:

   - Copy `.env.example` to `.env` in both client and server directories
   - Fill in the required environment variables

4. Start the services:

```bash
# Start Docker containers (Redis and Qdrant)
docker-compose up -d

# Start the server
cd server
pnpm dev

# Start the client (in a new terminal)
cd client
pnpm dev
```

## Features

- PDF document upload
- Vector embeddings generation using Google AI
- Document storage in Qdrant vector database
- Semantic search capabilities
- Real-time processing with Redis queue

## Tech Stack

- **Frontend**: Next.js
- **Backend**: Node.js
- **Vector Database**: Qdrant
- **Queue**: BullMQ with Redis
- **Embeddings**: Google AI
- **Container**: Docker
