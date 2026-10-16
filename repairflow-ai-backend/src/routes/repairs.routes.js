import { Router } from "express";
import { authenticate, allowRoles } from "../middleware/authenticate.js";
import { listRepairs, createRepair, getRepair, updateRepair, changeRepairStatus } from "../controllers/repairs.controller.js";

const router = Router();
router.use(authenticate);
router.get("/", listRepairs);
router.post("/", allowRoles("owner", "manager", "front_desk", "technician"), createRepair);
router.get("/:id", getRepair);
router.put("/:id", allowRoles("owner", "manager", "technician"), updateRepair);
router.patch("/:id/status", allowRoles("owner", "manager", "technician", "front_desk"), changeRepairStatus);
export default router;
