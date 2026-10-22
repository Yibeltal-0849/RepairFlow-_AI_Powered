
import { Router } from "express";
import {
  telegramWebhook,
} from "../controllers/telegramWebhook.controller.js";

const router = Router();

router.post("/", telegramWebhook);

export default router;
