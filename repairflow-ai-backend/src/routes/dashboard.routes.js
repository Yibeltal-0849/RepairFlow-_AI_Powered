import { Router } from "express";
import { authenticate, allowRoles } from "../middleware/authenticate.js";
import { summary } from "../controllers/dashboard.controller.js";

const router = Router();
router.get("/summary", authenticate, allowRoles("owner", "manager"), summary);
export default router;
