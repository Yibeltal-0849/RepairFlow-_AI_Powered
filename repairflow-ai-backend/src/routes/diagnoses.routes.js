import { Router } from "express";
import { authenticate, allowRoles } from "../middleware/authenticate.js";
import {
  listDiagnoses,
  reviewDiagnosis
} from "../controllers/diagnoses.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", listDiagnoses);

router.post(
  "/:id/review",
  allowRoles("owner", "manager", "technician"),
  reviewDiagnosis
);

export default router;