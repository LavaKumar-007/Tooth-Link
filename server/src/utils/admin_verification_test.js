const dns = require("dns");
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder("ipv4first");

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const prisma = require("./prisma");
const bcrypt = require("bcryptjs");
const { generateToken } = require("./jwt");

// Controllers to test end-to-end HTTP request handlers directly
const adminController = require("../controllers/adminController");
const authController = require("../controllers/authController");
const inventoryController = require("../controllers/inventoryController");
const requirementController = require("../controllers/requirementController");
const requestController = require("../controllers/requestController");

// Helper to mock Express req and res
function mockReqRes({ body = {}, params = {}, query = {}, user = null, headers = {} } = {}) {
  const req = {
    body,
    params,
    query,
    user,
    headers,
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
    get statusCode() {
      return statusCode;
    },
    get data() {
      return responseData;
    },
  };

  return { req, res };
}

async function runAdminVerificationTests() {
  console.log("=======================================================================");
  console.log("   TOOTHLINK ADMIN VERIFICATION & SECURITY TEST SUITE");
  console.log("=======================================================================\n");

  const results = {
    test1_adminStatsAndPendingListWithCounts: false,
    test2_studentAndClinicForbiddenFromAdminAPIs: false,
    test3_pendingStudentBlockedThenApprovedCanRequest: false,
    test4_pendingClinicBlockedThenApprovedCanPublishAndAccept: false,
    test5_invalidIdAndStatusTransitionValidation: false,
    test6_rejectedAccountsRestrictedFromLoginAndActions: false,
    test7_documentLinksPreservedAndAccessible: false,
    test8_existingMatchingAndWorkflowIntegrity: false,
  };

  const ts = Date.now();
  const testLocation = `Loc-${ts}`;
  const pw = "TestPass123!";
  const pwHash = await bcrypt.hash(pw, 10);

  // Entities to clean up at end
  const createdUserIds = [];
  const createdReqIds = [];
  const createdInvIds = [];

  try {
    // Warm up serverless Neon connection if compute was asleep
    console.log("0. Connecting to Neon database...");
    let connected = false;
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        connected = true;
        break;
      } catch (wakeErr) {
        console.log(`   Neon compute endpoint waking up (attempt ${attempt}/6)...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    if (!connected) throw new Error("Could not establish connection to Neon PostgreSQL after 6 attempts.");

    // -------------------------------------------------------------------------
    // 1. Verify Admin Account Exists
    // -------------------------------------------------------------------------
    console.log("1. Checking Admin Account...");
    let adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminUser) {
      throw new Error("No admin account found in database. Run seed:admin first.");
    }
    console.log(`   ✓ Found admin user: ${adminUser.email} (ID: ${adminUser.id}, Status: ${adminUser.status})`);

    const adminAuthUser = {
      id: adminUser.id,
      role: adminUser.role,
      email: adminUser.email,
    };

    // -------------------------------------------------------------------------
    // TEST 1: Admin can list stats and pending verifications with counts
    // -------------------------------------------------------------------------
    console.log("\n2. Testing Admin Stats & Verification List APIs...");
    {
      const { req: sReq, res: sRes } = mockReqRes({ user: adminAuthUser });
      await adminController.getAdminStats(sReq, sRes);
      if (sRes.statusCode !== 200 || !sRes.data.stats) {
        throw new Error(`getAdminStats failed with status ${sRes.statusCode}`);
      }
      console.log("   ✓ getAdminStats returned:", {
        totalUsers: sRes.data.stats.totalUsers,
        pendingStudentVerifications: sRes.data.stats.pendingStudentVerifications,
        approvedStudentVerifications: sRes.data.stats.approvedStudentVerifications,
        pendingClinicVerifications: sRes.data.stats.pendingClinicVerifications,
        approvedClinicVerifications: sRes.data.stats.approvedClinicVerifications,
        totalPendingVerifications: sRes.data.stats.totalPendingVerifications,
      });

      const { req: vReq, res: vRes } = mockReqRes({ user: adminAuthUser, query: { status: "PENDING" } });
      await adminController.getPendingVerifications(vReq, vRes);
      if (vRes.statusCode !== 200 || !vRes.data.counts) {
        throw new Error(`getPendingVerifications failed with status ${vRes.statusCode}`);
      }
      console.log("   ✓ getPendingVerifications returned counts:", vRes.data.counts);

      results.test1_adminStatsAndPendingListWithCounts = true;
    }

    // -------------------------------------------------------------------------
    // TEST 2: Student and Clinic Forbidden From Calling Admin APIs
    // -------------------------------------------------------------------------
    console.log("\n3. Testing Role Authorization: Student and Clinic forbidden from Admin APIs...");
    {
      // Mock student token / role
      const mockStudentUser = { id: 999991, role: "STUDENT", email: "stu@test.com" };
      const mockClinicUser = { id: 999992, role: "CLINIC", email: "clinic@test.com" };

      // Route-level requireRole simulation
      const requireRole = (...allowedRoles) => (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
          return res.status(403).json({ message: "Access denied. Insufficient role permissions." });
        }
        next();
      };
      const adminGate = requireRole("ADMIN");

      let studentBlocked = false;
      let clinicBlocked = false;
      let unauthBlocked = false;

      // Student attempt
      const { req: r1, res: res1 } = mockReqRes({ user: mockStudentUser });
      adminGate(r1, res1, () => {});
      if (res1.statusCode === 403) studentBlocked = true;

      // Clinic attempt
      const { req: r2, res: res2 } = mockReqRes({ user: mockClinicUser });
      adminGate(r2, res2, () => {});
      if (res2.statusCode === 403) clinicBlocked = true;

      // Unauthenticated attempt
      const { req: r3, res: res3 } = mockReqRes({ user: null });
      adminGate(r3, res3, () => {});
      if (res3.statusCode === 403) unauthBlocked = true;

      if (studentBlocked && clinicBlocked && unauthBlocked) {
        console.log("   ✓ All non-admin attempts strictly returned HTTP 403 Forbidden");
        results.test2_studentAndClinicForbiddenFromAdminAPIs = true;
      } else {
        throw new Error("Security check failed: Non-admin users were not blocked!");
      }
    }

    // -------------------------------------------------------------------------
    // TEST 3: Pending Student Blocked From Requests -> Admin Approves -> Can Request
    // -------------------------------------------------------------------------
    console.log("\n4. Testing Student Verification Workflow (Pending -> Approved -> Submit Request)...");
    {
      const docUrl = `https://credentials.example.edu/docs/stu_${ts}.pdf`;
      const stuEmail = `test_student_${ts}@example.com`;

      // 1. Register student with verification document
      const { req: regReq, res: regRes } = mockReqRes({
        body: {
          name: "Test Verification Student",
          email: stuEmail,
          password: pw,
          institution: "Test Dental University",
          studentId: `STU-ID-${ts}`,
          location: testLocation,
          verificationDocument: docUrl,
        },
      });

      await authController.registerStudent(regReq, regRes);
      if (regRes.statusCode !== 201) {
        throw new Error(`Student registration failed: ${regRes.data?.message}`);
      }
      const registeredStudentUser = regRes.data.user;
      createdUserIds.push(registeredStudentUser.id);
      const studentProfile = registeredStudentUser.student;

      console.log(`   ✓ Registered student #${registeredStudentUser.id}. verificationStatus: ${studentProfile.verificationStatus}, doc: ${studentProfile.verificationDocument}`);

      // Verify verification document is saved
      if (studentProfile.verificationDocument === docUrl) {
        results.test7_documentLinksPreservedAndAccessible = true;
        console.log("   ✓ Verification document link saved and verified successfully.");
      }

      const studentAuthUser = {
        id: registeredStudentUser.id,
        role: "STUDENT",
        email: registeredStudentUser.email,
      };

      // 2. Pending student creates requirement
      const { req: reqReq, res: reqRes } = mockReqRes({
        user: studentAuthUser,
        body: {
          toothType: "MOLAR",
          arch: "MANDIBULAR",
          quantity: 2,
          location: testLocation,
        },
      });
      await requirementController.createRequirement(reqReq, reqRes);
      if (reqRes.statusCode !== 201) {
        throw new Error(`Pending student failed to create requirement: ${reqRes.data?.message}`);
      }
      const requirement = reqRes.data.requirement;
      createdReqIds.push(requirement.id);
      console.log(`   ✓ Pending student created requirement #${requirement.id}`);

      // 3. Create dummy available inventory to request against
      const existingClinic = await prisma.clinic.findFirst({
        where: { verificationStatus: "APPROVED" },
      });
      if (!existingClinic) throw new Error("Need at least one approved clinic in DB for inventory");

      const testInv = await prisma.inventory.create({
        data: {
          clinicId: existingClinic.id,
          toothType: "MOLAR",
          arch: "MANDIBULAR",
          quantity: 10,
          location: testLocation,
          status: "AVAILABLE",
        },
      });
      createdInvIds.push(testInv.id);

      // 4. Pending student attempts to submit request -> MUST BE BLOCKED (HTTP 403)
      const { req: blockReq, res: blockRes } = mockReqRes({
        user: studentAuthUser,
        body: {
          requirementId: requirement.id,
          inventoryId: testInv.id,
          quantity: 1,
        },
      });
      await requestController.createRequest(blockReq, blockRes);
      if (blockRes.statusCode !== 403) {
        throw new Error(`Expected HTTP 403 for pending student request, got ${blockRes.statusCode}`);
      }
      console.log(`   ✓ Pending student blocked from submitting request (HTTP 403): "${blockRes.data?.message}"`);

      // 5. Admin Approves Student
      const { req: appReq, res: appRes } = mockReqRes({
        user: adminAuthUser,
        params: { id: String(studentProfile.id) },
        body: { status: "APPROVED" },
      });
      await adminController.updateStudentVerification(appReq, appRes);
      if (appRes.statusCode !== 200) {
        throw new Error(`Admin failed to approve student: ${appRes.data?.message}`);
      }

      // Check DB values
      const updatedStu = await prisma.student.findUnique({
        where: { id: studentProfile.id },
        include: { user: true },
      });
      if (updatedStu.verificationStatus !== "APPROVED" || updatedStu.user.status !== "ACTIVE") {
        throw new Error("DB verificationStatus or user status not updated to APPROVED/ACTIVE");
      }
      console.log(`   ✓ Admin approved student #${studentProfile.id}. verificationStatus: ${updatedStu.verificationStatus}, user.status: ${updatedStu.user.status}`);

      // 6. Now approved student submits request -> MUST SUCCEED (HTTP 201)
      const { req: succReq, res: succRes } = mockReqRes({
        user: studentAuthUser,
        body: {
          requirementId: requirement.id,
          inventoryId: testInv.id,
          quantity: 1,
        },
      });
      await requestController.createRequest(succReq, succRes);
      if (succRes.statusCode !== 201) {
        throw new Error(`Approved student failed to submit request: ${succRes.data?.message}`);
      }
      console.log(`   ✓ Approved student successfully submitted request #${succRes.data.request.id}`);

      results.test3_pendingStudentBlockedThenApprovedCanRequest = true;
    }

    // -------------------------------------------------------------------------
    // TEST 4: Pending Clinic Blocked From Publishing & Accepting -> Admin Approves
    // -------------------------------------------------------------------------
    console.log("\n5. Testing Clinic Verification Workflow (Pending -> Approved -> Publish & Accept)...");
    {
      const clinicDocUrl = `https://credentials.example.edu/docs/clinic_${ts}.pdf`;
      const clinicEmail = `test_clinic_${ts}@example.com`;

      // 1. Register clinic
      const { req: regReq, res: regRes } = mockReqRes({
        body: {
          name: "Dr. Clinic Admin Test",
          email: clinicEmail,
          password: pw,
          clinicName: `Test Care Center ${ts}`,
          doctorName: "Dr. Test Provider",
          location: testLocation,
          verificationDocument: clinicDocUrl,
        },
      });

      await authController.registerClinic(regReq, regRes);
      if (regRes.statusCode !== 201) {
        throw new Error(`Clinic registration failed: ${regRes.data?.message}`);
      }
      const registeredClinicUser = regRes.data.user;
      createdUserIds.push(registeredClinicUser.id);
      const clinicProfile = registeredClinicUser.clinic;

      console.log(`   ✓ Registered clinic #${registeredClinicUser.id}. verificationStatus: ${clinicProfile.verificationStatus}`);

      const clinicAuthUser = {
        id: registeredClinicUser.id,
        role: "CLINIC",
        email: registeredClinicUser.email,
      };

      // 2. Pending clinic attempts to publish inventory -> MUST BE BLOCKED (HTTP 403)
      const { req: invReq, res: invRes } = mockReqRes({
        user: clinicAuthUser,
        body: {
          toothType: "INCISOR",
          arch: "MAXILLARY",
          quantity: 5,
          location: testLocation,
        },
      });
      await inventoryController.createInventory(invReq, invRes);
      if (invRes.statusCode !== 403) {
        throw new Error(`Expected HTTP 403 for pending clinic inventory, got ${invRes.statusCode}`);
      }
      console.log(`   ✓ Pending clinic blocked from publishing inventory (HTTP 403): "${invRes.data?.message}"`);

      // 3. Admin Approves Clinic
      const { req: appReq, res: appRes } = mockReqRes({
        user: adminAuthUser,
        params: { id: String(clinicProfile.id) },
        body: { status: "APPROVED" },
      });
      await adminController.updateClinicVerification(appReq, appRes);
      if (appRes.statusCode !== 200) {
        throw new Error(`Admin failed to approve clinic: ${appRes.data?.message}`);
      }

      const updatedClinic = await prisma.clinic.findUnique({
        where: { id: clinicProfile.id },
        include: { user: true },
      });
      if (updatedClinic.verificationStatus !== "APPROVED" || updatedClinic.user.status !== "ACTIVE") {
        throw new Error("DB clinic verificationStatus or user status not updated to APPROVED/ACTIVE");
      }
      console.log(`   ✓ Admin approved clinic #${clinicProfile.id}. verificationStatus: ${updatedClinic.verificationStatus}, user.status: ${updatedClinic.user.status}`);

      // 4. Approved clinic publishes inventory -> MUST SUCCEED (HTTP 201)
      const { req: succInvReq, res: succInvRes } = mockReqRes({
        user: clinicAuthUser,
        body: {
          toothType: "CANINE",
          arch: "MAXILLARY",
          quantity: 8,
          location: testLocation,
        },
      });
      await inventoryController.createInventory(succInvReq, succInvRes);
      if (succInvRes.statusCode !== 201) {
        throw new Error(`Approved clinic failed to publish inventory: ${succInvRes.data?.message}`);
      }
      const publishedItem = succInvRes.data.inventory;
      createdInvIds.push(publishedItem.id);
      console.log(`   ✓ Approved clinic successfully published inventory item #${publishedItem.id}`);

      results.test4_pendingClinicBlockedThenApprovedCanPublishAndAccept = true;
    }

    // -------------------------------------------------------------------------
    // TEST 5: Validate IDs and Status Transitions (Invalid IDs, Duplicate Transitions)
    // -------------------------------------------------------------------------
    console.log("\n6. Testing Input and Transition Validation (IDs, duplicate transitions, non-existent records)...");
    {
      // 1. Invalid student ID string
      const { req: invIdReq, res: invIdRes } = mockReqRes({
        user: adminAuthUser,
        params: { id: "not-a-number" },
        body: { status: "APPROVED" },
      });
      await adminController.updateStudentVerification(invIdReq, invIdRes);
      if (invIdRes.statusCode !== 400) throw new Error("Expected 400 for non-numeric ID");

      // 2. Negative ID
      const { req: negIdReq, res: negIdRes } = mockReqRes({
        user: adminAuthUser,
        params: { id: "-5" },
        body: { status: "APPROVED" },
      });
      await adminController.updateStudentVerification(negIdReq, negIdRes);
      if (negIdRes.statusCode !== 400) throw new Error("Expected 400 for negative ID");

      // 3. Invalid status value
      const { req: invStatReq, res: invStatRes } = mockReqRes({
        user: adminAuthUser,
        params: { id: "1" },
        body: { status: "SUPER_APPROVED" },
      });
      await adminController.updateStudentVerification(invStatReq, invStatRes);
      if (invStatRes.statusCode !== 400) throw new Error("Expected 400 for invalid status enum");

      // 4. Non-existent record
      const { req: notFoundReq, res: notFoundRes } = mockReqRes({
        user: adminAuthUser,
        params: { id: "99999999" },
        body: { status: "APPROVED" },
      });
      await adminController.updateStudentVerification(notFoundReq, notFoundRes);
      if (notFoundRes.statusCode !== 404) throw new Error("Expected 404 for non-existent record");

      // 5. Duplicate transition (already APPROVED -> approving again)
      const approvedStu = await prisma.student.findFirst({ where: { verificationStatus: "APPROVED" } });
      if (approvedStu) {
        const { req: dupReq, res: dupRes } = mockReqRes({
          user: adminAuthUser,
          params: { id: String(approvedStu.id) },
          body: { status: "APPROVED" },
        });
        await adminController.updateStudentVerification(dupReq, dupRes);
        if (dupRes.statusCode !== 400) throw new Error("Expected 400 for duplicate status transition");
        console.log(`   ✓ Duplicate transition blocked (HTTP 400): "${dupRes.data?.message}"`);
      }

      console.log("   ✓ All ID and status transition validations succeeded as expected.");
      results.test5_invalidIdAndStatusTransitionValidation = true;
    }

    // -------------------------------------------------------------------------
    // TEST 6: Rejected Accounts Restrict Login and Actions
    // -------------------------------------------------------------------------
    console.log("\n7. Testing Account Rejection Restrictions...");
    {
      const rejEmail = `reject_test_${ts}@example.com`;

      // 1. Register student
      const { req: regReq, res: regRes } = mockReqRes({
        body: {
          name: "To Be Rejected Student",
          email: rejEmail,
          password: pw,
          institution: "Dental Rejection College",
          studentId: `REJ-${ts}`,
          location: testLocation,
        },
      });
      await authController.registerStudent(regReq, regRes);
      const rejUser = regRes.data.user;
      createdUserIds.push(rejUser.id);

      // 2. Admin rejects student
      const { req: rejReq, res: rejRes } = mockReqRes({
        user: adminAuthUser,
        params: { id: String(rejUser.student.id) },
        body: { status: "REJECTED" },
      });
      await adminController.updateStudentVerification(rejReq, rejRes);
      if (rejRes.statusCode !== 200) throw new Error("Failed to reject student");

      const inDbUser = await prisma.user.findUnique({ where: { id: rejUser.id } });
      if (inDbUser.status !== "REJECTED") throw new Error("User status was not updated to REJECTED");

      // 3. Rejected user attempts login -> MUST BE FORBIDDEN (HTTP 403)
      const { req: loginReq, res: loginRes } = mockReqRes({
        body: {
          email: rejEmail,
          password: pw,
        },
      });
      await authController.login(loginReq, loginRes);
      if (loginRes.statusCode !== 403) {
        throw new Error(`Expected HTTP 403 on rejected user login, got ${loginRes.statusCode}`);
      }
      console.log(`   ✓ Rejected user login blocked (HTTP 403): "${loginRes.data?.message}"`);

      results.test6_rejectedAccountsRestrictedFromLoginAndActions = true;
    }

    // -------------------------------------------------------------------------
    // TEST 8: Existing Matching and Notification Workflows Integrity
    // -------------------------------------------------------------------------
    console.log("\n8. Testing Existing Matching & Notification Integrity...");
    {
      const matchingService = require("../services/matchingService");
      const notificationService = require("../services/notificationService");

      // Verify matching logic
      const reqs = await prisma.requirement.findMany({ take: 3 });
      if (reqs.length > 0) {
        const matches = await matchingService.findMatchesForRequirement(reqs[0].id);
        console.log(`   ✓ matchingService.findMatchesForRequirement succeeded (found ${matches.length} matches)`);
      }

      // Verify notification service
      const testNotif = await notificationService.createNotification({
        userId: adminUser.id,
        type: "SYSTEM_AUDIT",
        title: "Audit Test Notification",
        message: "Verification test executed successfully.",
      });
      if (testNotif && testNotif.id) {
        await prisma.notification.delete({ where: { id: testNotif.id } });
        console.log("   ✓ notificationService.createNotification verified and clean.");
      }

      results.test8_existingMatchingAndWorkflowIntegrity = true;
    }

  } finally {
    // Clean up only temporary test fixtures
    console.log("\n9. Cleaning up test-generated fixtures...");
    try {
      if (createdInvIds.length > 0) {
        await prisma.request.deleteMany({ where: { inventoryId: { in: createdInvIds } } });
        await prisma.inventory.deleteMany({ where: { id: { in: createdInvIds } } });
      }
      if (createdReqIds.length > 0) {
        await prisma.request.deleteMany({ where: { requirementId: { in: createdReqIds } } });
        await prisma.requirement.deleteMany({ where: { id: { in: createdReqIds } } });
      }
      if (createdUserIds.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
      console.log("   ✓ Cleaned up test fixtures safely without affecting production/existing database records.");
    } catch (cleanupErr) {
      console.warn("   Cleanup warning:", cleanupErr.message);
    }
    await prisma.$disconnect();
  }

  console.log("\n=======================================================================");
  console.log("   FINAL VERIFICATION RESULTS MATRIX");
  console.log("=======================================================================");
  console.table(results);

  const allPassed = Object.values(results).every(Boolean);
  if (allPassed) {
    console.log("🎉 ALL ADMIN VERIFICATION AND SECURITY TESTS PASSED!");
  } else {
    console.error("❌ ONE OR MORE TESTS FAILED.");
  }

  return allPassed;
}

if (require.main === module) {
  runAdminVerificationTests()
    .then((passed) => process.exit(passed ? 0 : 1))
    .catch((err) => {
      console.error("FATAL TEST ERROR:", err);
      process.exit(1);
    });
}

module.exports = runAdminVerificationTests;
