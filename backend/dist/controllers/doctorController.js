"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyPatients = listMyPatients;
const prisma_1 = require("../prisma");
const client_1 = require("@prisma/client");
async function listMyPatients(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: "Authentication required" });
            return;
        }
        const allowedRoles = [client_1.Role.PHYSIOTHERAPIST, client_1.Role.RECEPTIONIST, client_1.Role.ADMIN];
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ success: false, error: "Forbidden" });
            return;
        }
        // Resolve doctor record for physiotherapist
        let doctorId = null;
        if (req.user.role === client_1.Role.PHYSIOTHERAPIST) {
            const doc = await prisma_1.prisma.doctor.findUnique({ where: { userId: req.user.id } });
            doctorId = doc ? doc.id : null;
            if (!doctorId) {
                res.json({ success: true, data: [] });
                return;
            }
        }
        const where = {};
        if (doctorId)
            where.doctorId = doctorId;
        const plans = await prisma_1.prisma.therapyPlan.findMany({
            where,
            select: {
                patient: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
            distinct: ["patientId"],
        });
        const patients = plans
            .map((p) => p.patient)
            .filter((p) => p !== null && p !== undefined);
        res.json({ success: true, data: patients });
    }
    catch (e) {
        console.error("listMyPatients error", e);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
