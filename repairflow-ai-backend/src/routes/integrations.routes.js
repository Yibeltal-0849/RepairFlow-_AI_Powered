import { Router } from "express";

import {
  authenticate,
  allowRoles
} from "../middleware/authenticate.js";

import {
  testTelegram,
  testSheets,
  syncSheets,
  listIntegrationLogs
} from "../controllers/integrations.controller.js";

const router = Router();

router.use(authenticate);


/*
|--------------------------------------------------------------------------
| Integration Logs
|--------------------------------------------------------------------------
*/
router.get(
  "/logs",
  allowRoles("owner", "manager"),
  listIntegrationLogs
);


/*
|--------------------------------------------------------------------------
| Telegram
|--------------------------------------------------------------------------
*/
router.post(
  "/telegram/test",
  allowRoles("owner", "manager"),
  testTelegram
);


/*
|--------------------------------------------------------------------------
| Google Sheets Connection Test
|--------------------------------------------------------------------------
*/
router.get(
  "/sheets/test",
  allowRoles("owner", "manager"),
  testSheets
);


/*
|--------------------------------------------------------------------------
| Google Sheets Synchronization
|--------------------------------------------------------------------------
*/
router.post(
  "/sheets/sync",
  allowRoles("owner", "manager"),
  syncSheets
);

export default router;