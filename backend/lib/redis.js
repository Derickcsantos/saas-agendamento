import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Usando redis:
// await redis.set("teste", "funcionando");
// const valor = await redis.get("teste");
// console.log(valor); // "funcionando"
