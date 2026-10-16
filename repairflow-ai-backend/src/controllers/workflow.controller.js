import { query } from "../config/db.js";
import {
  runWorkflowChecks
} from "../services/workflow.service.js";

export async function runWorkflow(req, res, next) {
  try {
    const result = await runWorkflowChecks();

    res.json({
      success: true,
      data: result
    });
  } catch (e) {
    next(e);
  }
}

export async function listActionableTasks(req, res, next) {
  try {
    const status = req.query.status || "open";

    const rows = await query(
      `SELECT
         t.workflow_task_id,
         t.repair_id,
         r.ticket_number,
         t.task_type,
         t.reason,
         t.priority,
         t.assigned_to,
         t.due_at,
         t.status,
         t.deduplication_key,
         t.resolved_at,
         t.created_at
       FROM workflow_tasks t
       LEFT JOIN repairs r
         ON r.repair_id = t.repair_id
       WHERE t.status = ?
       ORDER BY
         CASE t.priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
           ELSE 5
         END,
         t.due_at ASC
       LIMIT 200`,
      [status]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (e) {
    next(e);
  }
}


export async function resolveTask(req, res, next) {
  try {
    const { id } = req.params;
    const { note = "" } = req.body || {};

    const tasks = await query(
      `SELECT
         workflow_task_id,
         repair_id,
         task_type,
         reason,
         status
       FROM workflow_tasks
       WHERE workflow_task_id = ?
       LIMIT 1`,
      [id]
    );

    if (!tasks.length) {
      return res.status(404).json({
        success: false,
        message: "Workflow task not found."
      });
    }

    const task = tasks[0];

    if (task.status === "resolved") {
      return res.status(400).json({
        success: false,
        message: "Workflow task is already resolved."
      });
    }

    await query(
      `UPDATE workflow_tasks
       SET
         status = 'resolved',
         resolved_at = NOW()
       WHERE workflow_task_id = ?`,
      [id]
    );

    await query(
      `INSERT INTO audit_events
       (
         actor_id,
         entity_type,
         entity_id,
         action,
         metadata
       )
       VALUES (?, 'workflow_task', ?, 'workflow_task.resolved', ?)`,
      [
        req.user.user_id,
        id,
        JSON.stringify({
          repair_id: task.repair_id,
          note
        })
      ]
    );

    res.json({
      success: true,
      data: {
        workflow_task_id: Number(id),
        status: "resolved",
        resolved_by: req.user.user_id
      }
    });
  } catch (e) {
    next(e);
  }
}