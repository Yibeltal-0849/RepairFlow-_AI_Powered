import "dotenv/config";
import app from "./app.js";
import { pool } from "./config/db.js";


const port = Number(process.env.PORT || 3777);

try {
  await pool.query("SELECT 1");
  console.log("MySQL connection successful.");
  app.listen(port, () => console.log(`REPAIRFLOW AI API listening on http://localhost:${port}`));
} catch (error) {
  console.error("Could not connect to MySQL. Check your .env values and ensure MySQL is running.");
  console.error(error.message);
  process.exit(1);
}

async function shutdown() {
  console.log("Shutting down server...");
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
