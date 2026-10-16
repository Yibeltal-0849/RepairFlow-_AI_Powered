import { Router } from "express";
import { authenticate, allowRoles } from "../middleware/authenticate.js";
import {
  listNotifications,
  createNotification
} from "../controllers/notifications.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", listNotifications);

router.post(
  "/",
  allowRoles("owner", "manager", "front_desk"),
  createNotification
);

export default router;