import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { listMyPatients, getPatientHistory } from "../controllers/doctorController";

const router = express.Router();

router.get("/my-patients", authMiddleware, listMyPatients);
router.get("/patients/:patientId/history", authMiddleware, getPatientHistory);

export default router;
