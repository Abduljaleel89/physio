import { Response } from "express";
import { prisma } from "../prisma";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";

export async function listMyPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }
    const allowedRoles: Role[] = [Role.PHYSIOTHERAPIST, Role.RECEPTIONIST, Role.ADMIN];
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    // Resolve doctor record for physiotherapist
    let doctorId: number | null = null;
    if (req.user.role === Role.PHYSIOTHERAPIST) {
      const doc = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
      doctorId = doc ? doc.id : null;
      if (!doctorId) {
        res.json({ success: true, data: [] });
        return;
      }
    }

    const where: any = {};
    if (doctorId) where.doctorId = doctorId;

    const plans = await prisma.therapyPlan.findMany({
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
      .filter((p) => p !== null && p !== undefined) as { id: number; firstName: string | null; lastName: string | null }[];

    res.json({ success: true, data: patients });
  } catch (e) {
    console.error("listMyPatients error", e);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
