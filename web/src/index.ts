import express, { Request, Response } from "express";
import { json } from "body-parser";
import { randomUUID } from "crypto";
import { allowCORS, validateRequest } from "./middleware";
import { TASK_QUEUE } from "./constants";
import { getRabbitMQChannel, getRedisClient } from "./utils/clients";

const app = express();

// Middleware
app.use(json({ limit: "1mb" }));
app.use(allowCORS);

// Execute code endpoint
app.post("/execute", [validateRequest], async (req: Request, res: Response) => {
  const {
    code,
    lang,
    stdin = "",
    timeLimit = 1,
    memoryLimit = 512 * 1024,
    wait = false,
  } = req.body;

  try {
    // Generate unique job ID
    const jobId = randomUUID();

    const job = {
      id: jobId,
      status: "queued",
      details: {
        code,
        lang,
        stdin,
        timeLimit,
        // dunno why java wants 4GB memory atleast
        memoryLimit: ["java", "js"].includes(lang)
          ? 4 * 1024 * 1024
          : memoryLimit,
        createdAt: Date.now(),
      },
    };

    // Store initial job details in Redis
    const redisClient = await getRedisClient();
    await redisClient.set(`job:${job.id}`, JSON.stringify(job));

    const MQChannel = await getRabbitMQChannel();
    // Send to queue with jobId
    MQChannel.sendToQueue(TASK_QUEUE, Buffer.from(JSON.stringify(job)), {
      persistent: true,
    });
    if (!wait) {
      res.json({ id: jobId, status: "queued" });
      return;
    }
    // this just a placeholder for now
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const foo = await redisClient.get(`job:${job.id}`);
    const updatedJob = JSON.parse(foo || "{}");
    if (Object.keys(updatedJob).length === 0) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(updatedJob);
  } catch (error) {
    console.error("Queue error:", error);
    res.status(500).json({ error: "Failed to queue task" });
  }
});

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// Add a status check endpoint
app.get("/status/:jobId", async (req: Request, res: Response) => {
  try {
    const redisClient = await getRedisClient();
    const foo = await redisClient.get(`job:${req.params.jobId}`);
    const job = JSON.parse(foo || "{}");

    if (Object.keys(job).length === 0) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(job);
  } catch (error) {
    console.error("Redis error:", error);
    res.status(500).json({ error: "Failed to fetch job status" });
  }
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  },
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
