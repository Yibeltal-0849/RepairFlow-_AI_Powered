import { query } from "../config/db.js";
import { runDiagnosis } from "../services/diagnosis.service.js";
import { runShopManager } from "../services/shop-manager.service.js";


/*
|--------------------------------------------------------------------------
| Gemini Repair Diagnosis
|--------------------------------------------------------------------------
*/

export async function diagnoseRepair(req, res, next) {
  try {
    const {
      repair_id,
      symptoms = "",
      previous_attempts = "",
      measurements = "",
      additional_context = ""
    } = req.body || {};

    if (!repair_id) {
      return res.status(400).json({
        success: false,
        message: "repair_id is required."
      });
    }

    const repairs = await query(
      `SELECT
         repair_id,
         ticket_number,
         device_brand,
         device_model,
         reported_issue,
         diagnosis_summary,
         status
       FROM repairs
       WHERE repair_id = ?
       LIMIT 1`,
      [repair_id]
    );

    if (!repairs.length) {
      return res.status(404).json({
        success: false,
        message: "Repair not found."
      });
    }

    const result = await runDiagnosis({
      repairId: repair_id,
      symptoms,
      previousAttempts: previous_attempts,
      measurements,
      additionalContext: additional_context
    });

    res.status(201).json({
      success: true,

      data: {
        diagnosis_session_id:
          result.diagnosis_session_id,

        repair: {
          repair_id: repairs[0].repair_id,
          ticket_number: repairs[0].ticket_number,
          device_brand: repairs[0].device_brand,
          device_model: repairs[0].device_model,
          reported_issue: repairs[0].reported_issue,
          status: repairs[0].status
        },

        status: result.status,

        diagnosis: result.suggestions,

        message:
          "Gemini diagnosis generated successfully and is pending review."
      }
    });

  } catch (e) {
    next(e);
  }
}


/*
|--------------------------------------------------------------------------
| AI Shop Manager
|--------------------------------------------------------------------------
*/

export async function shopQuery(req, res, next) {
  try {
    const {
      question
    } = req.body || {};

    /*
    |--------------------------------------------------------------------------
    | Validate question
    |--------------------------------------------------------------------------
    */

    if (
      !question ||
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "question is required."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Repair Metrics
    |--------------------------------------------------------------------------
    */

    const [repairStats] = await query(
      `SELECT
         COUNT(*) AS total_repairs,

         SUM(
           status = 'Completed'
         ) AS completed_repairs,

         SUM(
           status = 'Ready for Pickup'
         ) AS ready_for_pickup,

         SUM(
           status NOT IN ('Completed', 'Cancelled')
         ) AS open_repairs,

         COALESCE(
           SUM(final_cost),
           0
         ) AS total_revenue

       FROM repairs`
    );


    /*
    |--------------------------------------------------------------------------
    | Overdue Repairs
    |--------------------------------------------------------------------------
    */

    const overdueRepairs = await query(
      `SELECT
         repair_id,
         ticket_number,
         device_brand,
         device_model,
         reported_issue,
         status,
         promised_at,
         assigned_to

       FROM repairs

       WHERE promised_at IS NOT NULL

         AND promised_at < NOW()

         AND status NOT IN (
           'Completed',
           'Cancelled'
         )

       ORDER BY promised_at ASC

       LIMIT 20`
    );


    /*
    |--------------------------------------------------------------------------
    | Open Workflow Tasks
    |--------------------------------------------------------------------------
    */

    const workflowTasks = await query(
      `SELECT
         t.workflow_task_id,
         t.repair_id,
         t.task_type,
         t.reason,
         t.priority,
         t.assigned_to,
         t.due_at,
         t.status,
         t.deduplication_key,
         t.created_at,
         r.ticket_number

       FROM workflow_tasks t

       LEFT JOIN repairs r
         ON r.repair_id = t.repair_id

       WHERE t.status = 'open'

       ORDER BY
         CASE t.priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
           ELSE 5
         END,

         t.due_at ASC

       LIMIT 50`
    );


    /*
    |--------------------------------------------------------------------------
    | Workflow Metrics
    |--------------------------------------------------------------------------
    */

    const [workflowStats] = await query(
      `SELECT

         COUNT(*) AS total_tasks,

         SUM(
           status = 'open'
         ) AS open_tasks,

         SUM(
           status = 'resolved'
         ) AS resolved_tasks,

         SUM(
           status = 'open'
           AND priority = 'urgent'
         ) AS urgent_tasks,

         SUM(
           status = 'open'
           AND priority = 'high'
         ) AS high_tasks

       FROM workflow_tasks`
    );


    /*
    |--------------------------------------------------------------------------
    | Pending Notifications
    |--------------------------------------------------------------------------
    */

    const pendingNotifications = await query(
      `SELECT
         notification_id,
         repair_id,
         channel,
         recipient,
         message,
         status,
         attempts

       FROM notifications

       WHERE status = 'pending'

       ORDER BY notification_id DESC

       LIMIT 50`
    );


    /*
    |--------------------------------------------------------------------------
    | Failed Notifications
    |--------------------------------------------------------------------------
    */

    const failedNotifications = await query(
      `SELECT
         notification_id,
         repair_id,
         channel,
         recipient,
         message,
         status,
         attempts

       FROM notifications

       WHERE status = 'failed'

       ORDER BY notification_id DESC

       LIMIT 50`
    );


    /*
    |--------------------------------------------------------------------------
    | Notification Metrics
    |--------------------------------------------------------------------------
    */

    const [notificationStats] = await query(
      `SELECT

         COUNT(*) AS total_notifications,

         SUM(
           status = 'pending'
         ) AS pending_notifications,

         SUM(
           status = 'sent'
         ) AS sent_notifications,

         SUM(
           status = 'failed'
         ) AS failed_notifications

       FROM notifications`
    );


    /*
    |--------------------------------------------------------------------------
    | Build Shop Data
    |--------------------------------------------------------------------------
    */

    const shopData = {

      repair_metrics: repairStats,

      workflow_metrics: workflowStats,

      notification_metrics: notificationStats,

      overdue_repairs: overdueRepairs,

      open_workflow_tasks: workflowTasks,

      pending_notifications:
        pendingNotifications,

      failed_notifications:
        failedNotifications
    };


    /*
    |--------------------------------------------------------------------------
    | Send Shop Data to Gemini
    |--------------------------------------------------------------------------
    */

    const result = await runShopManager({
      question: question.trim(),
      shopData
    });


    /*
    |--------------------------------------------------------------------------
    | Return AI Shop Manager Response
    |--------------------------------------------------------------------------
    */

    res.json({
      success: true,

      data: {
        question: question.trim(),

        answer:
          result.answer || "",

        summary:
          result.summary || "",

        priorities:
          Array.isArray(result.priorities)
            ? result.priorities
            : [],

        insights:
          Array.isArray(result.insights)
            ? result.insights
            : [],

        recommendations:
          Array.isArray(result.recommendations)
            ? result.recommendations
            : [],

        warnings:
          Array.isArray(result.warnings)
            ? result.warnings
            : []
      }
    });

  } catch (e) {
    next(e);
  }
}