// CLI wrapper around the watchlist digest. See src/lib/digest.ts.
//
//   npm run digest

import { runDigest } from "../src/lib/digest";

runDigest()
  .then((r) => console.log(`Digest done: ${r.notified}/${r.subscriptions} subscription(s) notified.`))
  .catch((err) => {
    console.error("Digest failed:", err.message);
    process.exit(1);
  });
