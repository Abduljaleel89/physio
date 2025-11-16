"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const doctorController_1 = require("../controllers/doctorController");
const router = express_1.default.Router();
router.get("/my-patients", authMiddleware_1.authMiddleware, doctorController_1.listMyPatients);
exports.default = router;
