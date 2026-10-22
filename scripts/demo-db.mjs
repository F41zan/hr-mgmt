/**
 * scripts/demo-db.mjs
 * Starts a throwaway in-memory MongoDB on 127.0.0.1:27017 for local demos.
 * Data disappears when this process stops (Ctrl+C).
 *
 *   npm run demo:db
 *   MONGODB_URI=mongodb://127.0.0.1:27017/hr-mgmt npm run dev
 */

import { MongoMemoryServer } from "mongodb-memory-server";

const port = Number(process.env.DEMO_DB_PORT ?? 27017);

const server = await MongoMemoryServer.create({
  instance: { port, ip: "127.0.0.1" },
});

console.log(`[demo-db] MongoDB ready at ${server.getUri()}`);
console.log("[demo-db] In-memory only — data is discarded on exit.");

const stop = async () => {
  await server.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
