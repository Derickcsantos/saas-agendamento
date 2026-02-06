import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://faithful-anchovy-48183.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "Abw3AAIncDI3ZGVmMDg0M2I4NjI0YTc2YTIyYzg3ODBlY2U5OWExN3AyNDgxODM",
});

// Usando redis:
// await redis.set("teste", "funcionando");
// const valor = await redis.get("teste");
// console.log(valor); // "funcionando"
