import { connect as connectRabbitMQ, Connection, Channel } from "amqplib";
import Redis from "ioredis";
import { TASK_QUEUE } from "../constants";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://dev:dev@mq:5672";
const REDIS_URL = process.env.REDIS_URL || "redis://cache:6379";

let rabbitConnection: Connection | null = null;
let rabbitChannel: Channel | null = null;
let redisClient: Redis | null = null;

export async function getRabbitMQChannel(): Promise<Channel> {
  if (!rabbitConnection) {
    let retries = 5; // Number of retries
    const delay = 2000; // Delay in milliseconds

    while (retries > 0) {
      try {
        rabbitConnection = await connectRabbitMQ(RABBITMQ_URL);
        rabbitChannel = await rabbitConnection.createChannel();
        rabbitChannel.assertQueue(TASK_QUEUE, {
          durable: true,
        });
        console.log("Connected to RabbitMQ");
        break; // Exit loop if connection is successful
      } catch (error) {
        console.error("Could not connect to RabbitMQ, will retry...", error);
        retries--;
        if (retries === 0) {
          throw new Error(
            "Could not connect to RabbitMQ after several attempts",
          );
        }
        await new Promise((res) => setTimeout(res, delay)); // Wait before retrying
      }
    }
  }
  return rabbitChannel!;
}

export async function getRedisClient(): Promise<Redis> {
  if (!redisClient) {
    let retries = 5; // Number of retries
    const delay = 2000; // Delay in milliseconds

    while (retries > 0) {
      try {
        redisClient = new Redis(REDIS_URL);
        await redisClient.ping(); // Test the connection
        console.log("Connected to Redis");
        break; // Exit loop if connection is successful
      } catch (error) {
        console.error("Could not connect to Redis, will retry...", error);
        retries--;
        if (retries === 0) {
          throw new Error("Could not connect to Redis after several attempts");
        }
        await new Promise((res) => setTimeout(res, delay)); // Wait before retrying
      }
    }
  }
  return redisClient!;
}

