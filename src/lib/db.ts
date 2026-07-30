import dns from "node:dns";
import mongoose from "mongoose";

/**
 * Force Node's DNS resolver to use Google/Cloudflare instead of
 * whatever resolver the OS/network provides.
 *
 * Why this is here: `mongodb+srv://` connection strings (used by
 * MongoDB Atlas) require an SRV-record DNS lookup to discover the
 * cluster's actual hosts. Some local networks, routers, and VPNs only
 * forward common record types (A/AAAA) and silently drop SRV queries,
 * which surfaces as `querySrv ECONNREFUSED` — a DNS failure, not a
 * MongoDB auth/network problem. Pointing Node at resolvers that fully
 * support SRV (8.8.8.8, 1.1.1.1) sidesteps that class of failure.
 *
 * This intentionally fails soft: if `dns.setServers` throws (e.g. a
 * locked-down sandbox), we log and continue rather than crashing the
 * app — connectToDatabase() will still surface a clear error below if
 * the connection genuinely can't be established.
 *
 * Scope note: this changes DNS resolution for the whole Node process,
 * not just this Mongoose connection, since it's a global Node API.
 * That's a non-issue for this app (it makes no other outbound network
 * calls), but worth knowing if this file is reused elsewhere.
 */
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (error) {
  console.warn("⚠️ Custom DNS resolver configuration skipped:", error);
}

/**
 * MongoDB connection helper.
 *
 * Why this exists (see TRD §11 risks): in Next.js API routes, each
 * request can be handled by a fresh serverless function invocation.
 * Calling `mongoose.connect()` on every request would open a new
 * connection every time and quickly exhaust MongoDB Atlas's free-tier
 * connection limit ("connection storm").
 *
 * The fix is the standard Next.js + Mongoose pattern: cache the
 * connection (and the in-flight connection promise) on the Node.js
 * global object, which survives across invocations within the same
 * warm serverless instance. Subsequent calls reuse the cached
 * connection instead of opening a new one.
 */

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Augment the Node.js global type so TypeScript knows about our cache.
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

/**
 * Returns a connected Mongoose instance, reusing an existing connection
 * when one is already open or being established.
 *
 * Throws a clear error if MONGODB_URI is missing, rather than letting
 * Mongoose fail later with a more confusing low-level error (NFR-1/NFR-2).
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and add your MongoDB Atlas connection string."
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
