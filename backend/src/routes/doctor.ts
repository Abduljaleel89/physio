import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { listMyPatients } from "../controllers/doctorController";

const router = express.Router();

router.get("/my-patients", authMiddleware, listMyPatients);

export default router;
