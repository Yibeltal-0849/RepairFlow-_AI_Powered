import { Router } from "express";
import { authenticate, allowRoles } from "../middleware/authenticate.js";
import {
  listActionableTasks,
  resolveTask,
  runWorkflow
} from "../controllers/workflow.controller.js";

const router = Router();

router.use(authenticate);

router.post(
  "/check",
  allowRoles("owner", "manager"),
  runWorkflow
);

router.get(
  "/actionable",
  allowRoles("owner", "manager", "technician", "front_desk"),
  listActionableTasks
);

router.post(
  "/tasks/:id/resolve",
  allowRoles("owner", "manager", "technician", "front_desk"),
  resolveTask
);



export default router;