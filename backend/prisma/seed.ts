import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...\n");

  // Clear existing data (optional - uncomment if you want fresh seed each time)
  // await prisma.auditLog.deleteMany();
  // await prisma.notification.deleteMany();
  // await prisma.invoice.deleteMany();
  // await prisma.upload.deleteMany();
  // await prisma.appointment.deleteMany();
  // await prisma.visitRequest.deleteMany();
  // await prisma.completionEvent.deleteMany();
  // await prisma.therapyPlanExercise.deleteMany();
  // await prisma.therapyPlan.deleteMany();
  // await prisma.exercise.deleteMany();
  // await prisma.patient.deleteMany();
  // await prisma.doctor.deleteMany();
  // await prisma.user.deleteMany();

  // Hash password for all users
  const hashedPassword = await bcrypt.hash("password123", 10);

  // 1. Create Admin User
  const admin = await prisma.user.create({
    data: {
      email: "admin@physio.com",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
  console.log("✅ Created Admin User:");
  console.log(`   Email: ${admin.email}`);
  console.log(`   Password: password123`);
  console.log(`   Role: ${admin.role}\n`);

  // 2. Create Receptionist User
  const receptionist = await prisma.user.create({
    data: {
      email: "receptionist@physio.com",
      password: hashedPassword,
      role: Role.RECEPTIONIST,
    },
  });
  console.log("✅ Created Receptionist User:");
  console.log(`   Email: ${receptionist.email}`);
  console.log(`   Password: password123`);
  console.log(`   Role: ${receptionist.role}\n`);

  // 3. Create Physiotherapist Users (2)
  const physio1 = await prisma.user.create({
    data: {
      email: "dr.smith@physio.com",
      password: hashedPassword,
      role: Role.PHYSIOTHERAPIST,
      doctorProfile: {
        create: {
          firstName: "John",
          lastName: "Smith",
          licenseNumber: "PHY-001",
          specialization: "Orthopedic Physical Therapy",
          phone: "+1-555-0101",
        },
      },
    },
  });

  const physio2 = await prisma.user.create({
    data: {
      email: "dr.jones@physio.com",
      password: hashedPassword,
      role: Role.PHYSIOTHERAPIST,
      doctorProfile: {
        create: {
          firstName: "Jane",
          lastName: "Jones",
          licenseNumber: "PHY-002",
          specialization: "Sports Physical Therapy",
          phone: "+1-555-0102",
        },
      },
    },
  });

  const doctor1 = await prisma.doctor.findUnique({
    where: { userId: physio1.id },
  });
  const doctor2 = await prisma.doctor.findUnique({
    where: { userId: physio2.id },
  });

  console.log("✅ Created Physiotherapist Users:");
  console.log(`   Dr. ${doctor1?.firstName} ${doctor1?.lastName}`);
  console.log(`   Email: ${physio1.email}`);
  console.log(`   Password: password123`);
  console.log(`   License: ${doctor1?.licenseNumber}`);
  console.log(`   Specialization: ${doctor1?.specialization}\n`);

  console.log(`   Dr. ${doctor2?.firstName} ${doctor2?.lastName}`);
  console.log(`   Email: ${physio2.email}`);
  console.log(`   Password: password123`);
  console.log(`   License: ${doctor2?.licenseNumber}`);
  console.log(`   Specialization: ${doctor2?.specialization}\n`);

  // 4. Create Patient Users (3)
  const patient1 = await prisma.user.create({
    data: {
      email: "patient1@example.com",
      password: hashedPassword,
      role: Role.PATIENT,
      patientProfile: {
        create: {
          regNumber: "PAT-001",
          firstName: "Alice",
          lastName: "Johnson",
          dateOfBirth: new Date("1985-05-15"),
          phone: "+1-555-0201",
          address: "123 Main St, City, State 12345",
        },
      },
    },
  });

  const patient2 = await prisma.user.create({
    data: {
      email: "patient2@example.com",
      password: hashedPassword,
      role: Role.PATIENT,
      patientProfile: {
        create: {
          regNumber: "PAT-002",
          firstName: "Bob",
          lastName: "Williams",
          dateOfBirth: new Date("1990-08-22"),
          phone: "+1-555-0202",
          address: "456 Oak Ave, City, State 12346",
        },
      },
    },
  });

  const patient3 = await prisma.user.create({
    data: {
      email: "patient3@example.com",
      password: hashedPassword,
      role: Role.PATIENT,
      patientProfile: {
        create: {
          regNumber: "PAT-003",
          firstName: "Carol",
          lastName: "Brown",
          dateOfBirth: new Date("1988-12-10"),
          phone: "+1-555-0203",
          address: "789 Pine Rd, City, State 12347",
        },
      },
    },
  });

  const patientProfile1 = await prisma.patient.findUnique({
    where: { userId: patient1.id },
  });
  const patientProfile2 = await prisma.patient.findUnique({
    where: { userId: patient2.id },
  });
  const patientProfile3 = await prisma.patient.findUnique({
    where: { userId: patient3.id },
  });

  console.log("✅ Created Patient Users:");
  console.log(`   ${patientProfile1?.firstName} ${patientProfile1?.lastName}`);
  console.log(`   Email: ${patient1.email}`);
  console.log(`   Password: password123`);
  console.log(`   Registration Number: ${patientProfile1?.regNumber}\n`);

  console.log(`   ${patientProfile2?.firstName} ${patientProfile2?.lastName}`);
  console.log(`   Email: ${patient2.email}`);
  console.log(`   Password: password123`);
  console.log(`   Registration Number: ${patientProfile2?.regNumber}\n`);

  console.log(`   ${patientProfile3?.firstName} ${patientProfile3?.lastName}`);
  console.log(`   Email: ${patient3.email}`);
  console.log(`   Password: password123`);
  console.log(`   Registration Number: ${patientProfile3?.regNumber}\n`);

  // 5. Create Exercises (6)
  const exercises = await Promise.all([
    prisma.exercise.create({
      data: {
        name: "Knee Flexion Stretch",
        description: "Gentle stretching exercise for knee flexibility",
        instructions: "Sit on a chair, slowly bend your knee, hold for 30 seconds, repeat 10 times",
        difficulty: "BEGINNER",
        duration: 15,
      },
    }),
    prisma.exercise.create({
      data: {
        name: "Ankle Circles",
        description: "Improves ankle mobility",
        instructions: "Rotate your ankle in circles, 10 clockwise, 10 counterclockwise",
        difficulty: "BEGINNER",
        duration: 5,
      },
    }),
    prisma.exercise.create({
      data: {
        name: "Shoulder Rotation",
        description: "Rehabilitation exercise for shoulder injuries",
        instructions: "Slowly rotate your shoulder in full circles, 3 sets of 10",
        difficulty: "INTERMEDIATE",
        duration: 20,
      },
    }),
    prisma.exercise.create({
      data: {
        name: "Lower Back Extension",
        description: "Strengthens lower back muscles",
        instructions: "Lie prone, lift your chest off the ground, hold for 5 seconds, repeat 12 times",
        difficulty: "INTERMEDIATE",
        duration: 15,
      },
    }),
    prisma.exercise.create({
      data: {
        name: "Advanced Squat Progression",
        description: "Advanced leg strengthening",
        instructions: "Perform squats with proper form, 3 sets of 15 repetitions",
        difficulty: "ADVANCED",
        duration: 30,
      },
    }),
    prisma.exercise.create({
      data: {
        name: "Plyometric Box Jumps",
        description: "Advanced jumping exercise for athletic performance",
        instructions: "Jump onto a box platform and step down, 3 sets of 8 repetitions",
        difficulty: "ADVANCED",
        duration: 20,
      },
    }),
  ]);

  console.log("✅ Created Exercises:");
  exercises.forEach((exercise, index) => {
    console.log(`   ${index + 1}. ${exercise.name} (${exercise.difficulty})`);
  });
  console.log("");

  // 6. Create Therapy Plans (3) connecting patients to therapists
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // Therapy Plan 1: Patient 1 with Dr. Smith
  const plan1 = await prisma.therapyPlan.create({
    data: {
      patientId: patientProfile1!.id,
      doctorId: doctor1!.id,
      name: "Knee Rehabilitation Program",
      description: "Comprehensive 4-week program for post-surgery knee recovery",
      startDate: today,
      endDate: nextMonth,
      status: "ACTIVE",
      exercises: {
        create: [
          {
            exerciseId: exercises[0].id,
            order: 1,
            reps: 10,
            sets: 2,
            duration: 15,
            frequency: "Daily",
            notes: "Perform in the morning",
          },
          {
            exerciseId: exercises[1].id,
            order: 2,
            reps: 10,
            sets: 3,
            duration: 5,
            frequency: "Daily",
          },
          {
            exerciseId: exercises[2].id,
            order: 3,
            reps: 10,
            sets: 3,
            duration: 20,
            frequency: "Every other day",
          },
        ],
      },
    },
  });

  // Therapy Plan 2: Patient 2 with Dr. Jones
  const plan2 = await prisma.therapyPlan.create({
    data: {
      patientId: patientProfile2!.id,
      doctorId: doctor2!.id,
      name: "Lower Back Strengthening",
      description: "8-week program to strengthen core and lower back",
      startDate: today,
      endDate: nextMonth,
      status: "ACTIVE",
      exercises: {
        create: [
          {
            exerciseId: exercises[3].id,
            order: 1,
            reps: 12,
            sets: 3,
            duration: 15,
            frequency: "Daily",
          },
          {
            exerciseId: exercises[0].id,
            order: 2,
            reps: 10,
            sets: 2,
            duration: 15,
            frequency: "3x per week",
          },
        ],
      },
    },
  });

  // Therapy Plan 3: Patient 3 with Dr. Smith
  const plan3 = await prisma.therapyPlan.create({
    data: {
      patientId: patientProfile3!.id,
      doctorId: doctor1!.id,
      name: "Advanced Athletic Training",
      description: "Performance enhancement program",
      startDate: today,
      endDate: nextMonth,
      status: "ACTIVE",
      exercises: {
        create: [
          {
            exerciseId: exercises[4].id,
            order: 1,
            reps: 15,
            sets: 3,
            duration: 30,
            frequency: "3x per week",
          },
          {
            exerciseId: exercises[5].id,
            order: 2,
            reps: 8,
            sets: 3,
            duration: 20,
            frequency: "2x per week",
            notes: "Ensure proper warm-up before",
          },
        ],
      },
    },
  });

  console.log("✅ Created Therapy Plans:");
  console.log(`   1. ${plan1.name}`);
  console.log(`      Patient: ${patientProfile1?.firstName} ${patientProfile1?.lastName} (${patientProfile1?.regNumber})`);
  console.log(`      Doctor: Dr. ${doctor1?.firstName} ${doctor1?.lastName}`);
  console.log(`      Exercises: 3\n`);

  console.log(`   2. ${plan2.name}`);
  console.log(`      Patient: ${patientProfile2?.firstName} ${patientProfile2?.lastName} (${patientProfile2?.regNumber})`);
  console.log(`      Doctor: Dr. ${doctor2?.firstName} ${doctor2?.lastName}`);
  console.log(`      Exercises: 2\n`);

  console.log(`   3. ${plan3.name}`);
  console.log(`      Patient: ${patientProfile3?.firstName} ${patientProfile3?.lastName} (${patientProfile3?.regNumber})`);
  console.log(`      Doctor: Dr. ${doctor1?.firstName} ${doctor1?.lastName}`);
  console.log(`      Exercises: 2\n`);

  console.log("🎉 Seeding completed successfully!\n");
  console.log("📋 Summary:");
  console.log(`   - Users: 6 (1 Admin, 1 Receptionist, 2 Physiotherapists, 3 Patients)`);
  console.log(`   - Exercises: 6`);
  console.log(`   - Therapy Plans: 3\n`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

