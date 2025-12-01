import mongoose, { Connection, Mongoose } from 'mongoose';

/**
 * Shape of the cached Mongoose connection stored on `globalThis`.
 *
 * `conn` holds the active connection instance (once connected).
 * `promise` holds the in‑flight connection attempt so that concurrent
 * callers share the same promise instead of opening multiple connections.
 */
interface MongooseCache {
  conn: Connection | null;
  promise: Promise<Mongoose> | null;
}

// Extend the Node.js global type so we can safely attach our cache.
declare global {
  // `var` is used on purpose because Node's `global` uses `var` semantics.
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

/**
 * Initialize the global cache once. In serverless / Next.js environments
 * this ensures we reuse the same connection between hot reloads in dev.
 */
const globalForMongoose = globalThis as typeof globalThis & {
  _mongoose?: MongooseCache;
};

if (!globalForMongoose._mongoose) {
  globalForMongoose._mongoose = { conn: null, promise: null };
}

const cached = globalForMongoose._mongoose;

/**
 * Get the MongoDB connection URI from the environment.
 *
 * You should define `MONGODB_URI` in your environment (e.g. `.env.local`).
 * Throwing here fails fast during startup if the variable is missing.
 */
const MONGODB_URI: string = process.env.MONGODB_URI ?? '';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

/**
 * Connect to MongoDB using Mongoose.
 *
 * This function:
 * - Reuses an existing connection if available
 * - Shares an in‑flight connection promise across callers
 * - Is safe to call in API routes, server components, and route handlers
 */
export async function connectToDatabase(): Promise<Connection> {
  if (cached.conn) {
    // Reuse existing connection if it is already established.
    return cached.conn;
  }

  if (!cached.promise) {
    // Create a new connection promise if one is not already in progress.
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        // Recommended options for modern Mongoose
        autoIndex: false, // Disable auto-creating indexes in production for performance
        serverSelectionTimeoutMS: 30_000,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  const mongooseInstance = await cached.promise;

  // Cache the underlying connection for future calls.
  cached.conn = mongooseInstance.connection;

  return cached.conn;
}

/**
 * Convenience export for cases where you only need the `mongoose` instance,
 * e.g. for defining schemas and models in other files.
 */
export { mongoose };
