import { query } from "../config/db.js";

export async function summary(req, res, next) {
  try {
    const [repairCounts, lowStock, openTasks] = await Promise.all([
      query("SELECT status, COUNT(*) AS count FROM repairs GROUP BY status"),
      query("SELECT product_id, sku, name, quantity_on_hand, reorder_level FROM products WHERE quantity_on_hand <= reorder_level ORDER BY quantity_on_hand ASC LIMIT 100"),
      query("SELECT workflow_task_id, repair_id, task_type, reason, priority, due_at, status FROM workflow_tasks WHERE status IN ('open','in_progress') ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, due_at ASC LIMIT 100")
    ]);
    res.json({ success: true, data: { repair_counts_by_status: repairCounts, low_stock_products: lowStock, actionable_tasks: openTasks } });
  } catch (e) { next(e); }
}
