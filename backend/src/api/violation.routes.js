import express from "express";
import { recordViolation } from "../controllers/violation.controller.js";

const router = express.Router();

router.post("/add-violations", recordViolation);

export default router;
