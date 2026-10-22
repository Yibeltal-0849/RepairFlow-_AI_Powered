import { Router } from "express";
import { authenticate, allowRoles } from "../middleware/authenticate.js";
import { listCustomers, createCustomer, getCustomer, updateCustomer } from "../controllers/customers.controller.js";
import {
  createTelegramLink,
} from "../controllers/telegramLink.controller.js";

const router = Router();
router.use(authenticate);
router.get("/", listCustomers);
router.post("/", allowRoles("owner", "manager", "front_desk"), createCustomer);
router.get("/:id", getCustomer);
router.put("/:id", allowRoles("owner", "manager", "front_desk"), updateCustomer);
router.post(
  "/:id/telegram-link",
  allowRoles("owner", "manager", "front_desk"),
  createTelegramLink
);
export default router;
