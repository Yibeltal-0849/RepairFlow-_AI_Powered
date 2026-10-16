import { query, withTransaction } from "../config/db.js";


async function createTaskIfMissing({
  repairId,
  taskType,
  reason,
  priority = "medium",
  assignedTo = null,
  dueAt = null,
  deduplicationKey
}) {
  const existing = await query(
    `SELECT
       workflow_task_id,
       status
     FROM workflow_tasks
     WHERE deduplication_key = ?
     LIMIT 1`,
    [deduplicationKey]
  );

  if (existing.length) {
    return {
      created: false,
      workflow_task_id:
        existing[0].workflow_task_id,
      status: existing[0].status
    };
  }

  const result = await query(
    `INSERT INTO workflow_tasks
     (
       repair_id,
       task_type,
       reason,
       priority,
       assigned_to,
       due_at,
       status,
       deduplication_key
     )
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
    [
      repairId,
      taskType,
      reason,
      priority,
      assignedTo,
      dueAt,
      deduplicationKey
    ]
  );

  return {
    created: true,
    workflow_task_id: result.insertId,
    status: "open"
  };
}


export async function evaluateOverdueRepairs() {
  const repairs = await query(
    `SELECT
       repair_id,
       ticket_number,
       status,
       promised_at,
       assigned_to
     FROM repairs
     WHERE promised_at IS NOT NULL
       AND promised_at < NOW()
       AND status NOT IN ('Completed', 'Cancelled')
     ORDER BY promised_at ASC`
  );

  const results = [];

  for (const repair of repairs) {
    const task = await createTaskIfMissing({
      repairId: repair.repair_id,

      taskType: "overdue_repair",

      reason:
        `Repair ${repair.ticket_number} is overdue. ` +
        `Promised date was ${repair.promised_at}.`,

      priority: "high",

      assignedTo: repair.assigned_to,

      dueAt: repair.promised_at,

      deduplicationKey:
        `repair:${repair.repair_id}:overdue`
    });

    results.push({
      repair_id: repair.repair_id,
      ticket_number: repair.ticket_number,
      ...task
    });
  }

  return results;
}


export async function evaluateWaitingForPart() {
  const repairs = await query(
    `SELECT
       repair_id,
       ticket_number,
       status,
       assigned_to
     FROM repairs
     WHERE status = 'Waiting for Part'
     ORDER BY updated_at ASC`
  );

  const results = [];

  for (const repair of repairs) {
    const task = await createTaskIfMissing({
      repairId: repair.repair_id,

      taskType: "waiting_for_part",

      reason:
        `Repair ${repair.ticket_number} is waiting for a required part.`,

      priority: "high",

      assignedTo: repair.assigned_to,

      deduplicationKey:
        `repair:${repair.repair_id}:waiting-for-part`
    });

    results.push({
      repair_id: repair.repair_id,
      ticket_number: repair.ticket_number,
      ...task
    });
  }

  return results;
}


export async function evaluateStaleRepairs({
  days = 3
} = {}) {
  const safeDays =
    Math.max(1, Number(days) || 3);

  const repairs = await query(
    `SELECT
       repair_id,
       ticket_number,
       status,
       assigned_to,
       updated_at
     FROM repairs
     WHERE status NOT IN ('Completed', 'Cancelled')
       AND updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY updated_at ASC`,
    [safeDays]
  );

  const results = [];

  for (const repair of repairs) {
    const task = await createTaskIfMissing({
      repairId: repair.repair_id,

      taskType: "stale_repair",

      reason:
        `Repair ${repair.ticket_number} has not been updated ` +
        `for at least ${safeDays} days.`,

      priority: "medium",

      assignedTo: repair.assigned_to,

      deduplicationKey:
        `repair:${repair.repair_id}:stale:${safeDays}`
    });

    results.push({
      repair_id: repair.repair_id,
      ticket_number: repair.ticket_number,
      ...task
    });
  }

  return results;
}


export async function runWorkflowChecks() {
  const overdue =
    await evaluateOverdueRepairs();

  const waitingForPart =
    await evaluateWaitingForPart();

  const stale =
    await evaluateStaleRepairs({
      days: 3
    });

  const created = [
    ...overdue,
    ...waitingForPart,
    ...stale
  ].filter(item => item.created);

  await query(
    `INSERT INTO audit_events
     (
       actor_id,
       entity_type,
       entity_id,
       action,
       metadata
     )
     VALUES (?, ?, ?, ?, ?)`,
    [
      null,
      "workflow",
      null,
      "workflow.check_completed",
      JSON.stringify({
        overdue_checked: overdue.length,
        waiting_for_part_checked:
          waitingForPart.length,
        stale_checked: stale.length,
        tasks_created: created.length
      })
    ]
  );

  return {
    success: true,

    checked: {
      overdue: overdue.length,
      waiting_for_part:
        waitingForPart.length,
      stale: stale.length
    },

    created: created.length,

    tasks: created
  };
}


export async function resolveWorkflowTask({
  workflowTaskId,
  userId,
  note = ""
}) {
  const tasks = await query(
    `SELECT
       workflow_task_id,
       repair_id,
       task_type,
       status
     FROM workflow_tasks
     WHERE workflow_task_id = ?
     LIMIT 1`,
    [workflowTaskId]
  );

  if (!tasks.length) {
    throw new Error(
      "Workflow task not found."
    );
  }

  const task = tasks[0];

  if (task.status === "resolved") {
    throw new Error(
      "Workflow task is already resolved."
    );
  }

  await withTransaction(async conn => {
    await conn.execute(
      `UPDATE workflow_tasks
       SET
         status = 'resolved',
         resolved_at = NOW()
       WHERE workflow_task_id = ?`,
      [workflowTaskId]
    );

    await conn.execute(
      `INSERT INTO audit_events
       (
         actor_id,
         entity_type,
         entity_id,
         action,
         metadata
       )
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        "workflow_task",
        workflowTaskId,
        "workflow_task.resolved",
        JSON.stringify({
          repair_id: task.repair_id,
          task_type: task.task_type,
          note
        })
      ]
    );
  });

  return {
    workflow_task_id:
      Number(workflowTaskId),
    repair_id: task.repair_id,
    status: "resolved",
    resolved_by: userId
  };
}