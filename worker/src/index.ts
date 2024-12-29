import rabbitmq from "amqplib";
import { Redis } from "ioredis";

import { TASK_QUEUE } from "./constants";
import { Job } from "./types";
import IsolateRunner from "./utils/isolate-runner";
import { getRabbitMQChannel, getRedisClient } from "./utils/clients";

const runner = new IsolateRunner();

async function processJob(job: Job, redisClient: Redis) {
  try {
    console.log(`Processing job ${job.id}`);
    console.log(Object.entries(job));
    await redisClient.set(
      `job:${job.id}`,
      JSON.stringify({ ...job, status: "running" }),
    );

    // Simulate some work
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    const result = await runner.runCode({
      code: job.details.code,
      lang: job.details.lang,
      stdin: job.details.stdin || "",
      options: {
        timeLimit: job.details.timeLimit,
        memoryLimit: job.details.memoryLimit,
        subProcessLimit: job.details.subProcessLimit,
      },
    });
    console.log(result);
    await redisClient.set(
      `job:${job.id}`,
      JSON.stringify({
        ...job,
        status: "completed",
        result,
      }),
    );
    console.log(`Completed job ${job.id}`);
    await redisClient.expire(`job:${job.id}`, 3600);
  } catch (error) {
    console.error(`Failed to process job ${job.id}:`, error);
    // throw error;
  }
}

async function startConsumer() {
  try {
    console.log("Worker waiting for messages...");
    const MQChannel = await getRabbitMQChannel();
    const redisClient = await getRedisClient();
    if (!MQChannel || !redisClient) {
      throw new Error("MQChannel or redisClient not initialized");
    }

    MQChannel.prefetch(1); // Process one message at a time

    MQChannel.consume(TASK_QUEUE, async (msg) => {
      if (!msg || !MQChannel) return;
      const job: Job = JSON.parse(msg.content.toString());
      try {
        await processJob(job, redisClient);
        MQChannel.ack(msg);
      } catch (error) {
        // Reject the message and requeue it
        MQChannel.nack(msg, false, true);
      }
    });
  } catch (error) {
    console.error("Error starting consumer:", error);
    process.exit(1);
  }
}

console.log("Starting worker consumer...");
startConsumer();
//
// const foo = async () => {
//   const runner = new IsolateRunner();
//
//   const result = await runner.runCode({
//     code: "print('hello')",
//     lang: "py",
//     stdin: "",
//     options: {},
//   });
//   console.log(result);
// };
// foo();
