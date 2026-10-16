import { query } from "../config/db.js";

export async function audit(actorId, entityType, entityId, action, metadata = null) {
  await query(
    "INSERT INTO audit_events (actor_id, entity_type, entity_id, action, metadata) VALUES (?, ?, ?, ?, ?)",
    [actorId ?? null, entityType, entityId ?? null, action, metadata == null ? null : JSON.stringify(metadata)]
  );
}
