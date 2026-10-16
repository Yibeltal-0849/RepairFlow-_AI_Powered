import { Router } from "express";
import {
  authenticate,
  allowRoles
} from "../middleware/authenticate.js";

import {
  diagnoseRepair,
  shopQuery
} from "../controllers/ai.controller.js";

const router = Router();


/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

router.use(authenticate);


/*
|--------------------------------------------------------------------------
| Gemini Repair Diagnosis
|--------------------------------------------------------------------------
*/

router.post(
  "/diagnose",
  allowRoles(
    "owner",
    "manager",
    "technician"
  ),
  diagnoseRepair
);


/*
|--------------------------------------------------------------------------
| AI Shop Manager
|--------------------------------------------------------------------------
*/

router.post(
  "/shop-query",
  allowRoles(
    "owner",
    "manager"
  ),
  shopQuery
);


export default router;