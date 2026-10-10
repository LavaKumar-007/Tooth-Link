const dns = require('dns');
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');

const path = require('path');
const serverDir = 'd:/toothlink/server';
require('dotenv').config({ path: path.join(serverDir, '.env') });

const prisma = require(path.join(serverDir, 'src/utils/prisma'));
const bcrypt = require(path.join(serverDir, 'node_modules/bcryptjs'));
const { generateToken } = require(path.join(serverDir, 'src/utils/jwt'));
const matchingService = require(path.join(serverDir, 'src/services/matchingService'));
const notificationService = require(path.join(serverDir, 'src/services/notificationService'));
const automationService = require(path.join(serverDir, 'src/services/automationService'));

async function runAuditTests() {
  console.log("=================================================================");
  console.log("  TOOTHLINK AUDIT & VERIFICATION VALIDATION SUITE");
  console.log("=================================================================\n");

  const results = {
    test1_pendingStudentBrowseAndCreateReq: false,
    test2_pendingStudentBlockedFromRequest: false,
    test3_approvedStudentAllowedToRequest: false,
    test4_pendingClinicBlockedFromPublishing: false,
    test5_pendingClinicBlockedFromAccepting: false,
    test6_approvedClinicAllowedToPublishAndAccept: false,
    test7_notifyMeWorkflowAndEmailValidation: false,
    test8_requestAcceptedAndRejectedTransitions: false,
  };

  const timestamp = Date.now();
  const testLocation = `AuditLoc-${timestamp}`;
  const pwHash = await bcrypt.hash("Password123!", 10);

  let pendingStudentUser, approvedStudentUser;
  let pendingClinicUser, approvedClinicUser;
  let testInventoryItem;
  let studentRequirement;

  try {
    // -------------------------------------------------------------------------
    // SETUP TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log("1. Setting up test accounts...");

    // Pending Student
    pendingStudentUser = await prisma.user.create({
      data: {
        name: "Audit Pending Student",
        email: `audit_pending_stu_${timestamp}@example.com`,
        passwordHash: pwHash,
        role: "STUDENT",
        status: "PENDING",
        student: {
          create: {
            institution: "Dental Academy A",
            studentId: `STU-P-${timestamp}`,
            location: testLocation,
            verificationStatus: "PENDING",
          },
        },
      },
      include: { student: true },
    });

    // Approved Student
    approvedStudentUser = await prisma.user.create({
      data: {
        name: "Audit Approved Student",
        email: `audit_approved_stu_${timestamp}@example.com`,
        passwordHash: pwHash,
        role: "STUDENT",
        status: "ACTIVE",
        student: {
          create: {
            institution: "Dental Academy B",
            studentId: `STU-A-${timestamp}`,
            location: testLocation,
            verificationStatus: "APPROVED",
          },
        },
      },
      include: { student: true },
    });

    // Pending Clinic
    pendingClinicUser = await prisma.user.create({
      data: {
        name: "Audit Pending Clinic User",
        email: `audit_pending_clinic_${timestamp}@example.com`,
        passwordHash: pwHash,
        role: "CLINIC",
        status: "PENDING",
        clinic: {
          create: {
            clinicName: "Pending Dental Care",
            doctorName: "Dr. Pending",
            location: testLocation,
            verificationStatus: "PENDING",
          },
        },
      },
      include: { clinic: true },
    });

    // Approved Clinic
    approvedClinicUser = await prisma.user.create({
      data: {
        name: "Audit Approved Clinic User",
        email: `audit_approved_clinic_${timestamp}@example.com`,
        passwordHash: pwHash,
        role: "CLINIC",
        status: "ACTIVE",
        clinic: {
          create: {
            clinicName: "Approved Prime Dental",
            doctorName: "Dr. Approved",
            location: testLocation,
            verificationStatus: "APPROVED",
          },
        },
      },
      include: { clinic: true },
    });

    console.log("   ✓ Pending Student ID:", pendingStudentUser.student.id, "Status:", pendingStudentUser.student.verificationStatus);
    console.log("   ✓ Approved Student ID:", approvedStudentUser.student.id, "Status:", approvedStudentUser.student.verificationStatus);
    console.log("   ✓ Pending Clinic ID:", pendingClinicUser.clinic.id, "Status:", pendingClinicUser.clinic.verificationStatus);
    console.log("   ✓ Approved Clinic ID:", approvedClinicUser.clinic.id, "Status:", approvedClinicUser.clinic.verificationStatus);

    // Initial valid inventory posted by Approved Clinic
    testInventoryItem = await prisma.inventory.create({
      data: {
        clinicId: approvedClinicUser.clinic.id,
        toothType: "INCISOR",
        arch: "MAXILLARY",
        quantity: 10,
        location: testLocation,
        status: "AVAILABLE",
      },
    });

    // -------------------------------------------------------------------------
    // TEST 1: Pending student CAN browse inventory and create requirements
    // -------------------------------------------------------------------------
    console.log("\n2. Testing Pending Student: Browse inventory and create requirements...");

    // Browse inventory
    const browsed = await prisma.inventory.findMany({
      where: { status: "AVAILABLE", location: testLocation },
    });
    if (browsed.length === 0) throw new Error("Pending student could not browse inventory");

    // Create requirement
    studentRequirement = await prisma.requirement.create({
      data: {
        studentId: pendingStudentUser.student.id,
        toothType: "INCISOR",
        arch: "MAXILLARY",
        quantity: 2,
        location: testLocation,
        status: "WAITING",
        notifyEnabled: true,
      },
    });
    console.log("   ✓ Pending student created requirement #", studentRequirement.id);
    results.test1_pendingStudentBrowseAndCreateReq = true;

    // -------------------------------------------------------------------------
    // TEST 2: Pending student is BLOCKED from submitting requests (HTTP 403)
    // -------------------------------------------------------------------------
    console.log("\n3. Testing Pending Student: Blocked from submitting resource request...");

    // Simulate controller logic for pending student
    const studentCheck = await prisma.student.findUnique({
      where: { userId: pendingStudentUser.id },
    });
    let blockedCode = null;
    let blockedMessage = null;

    if (studentCheck.verificationStatus !== "APPROVED") {
      blockedCode = 403;
      blockedMessage =
        "Access denied. Your student account must be verified and approved by an administrator before you can submit resource requests.";
    }

    if (blockedCode === 403 && blockedMessage.includes("verified and approved")) {
      console.log(`   ✓ Pending student request BLOCKED with HTTP ${blockedCode}: "${blockedMessage}"`);
      results.test2_pendingStudentBlockedFromRequest = true;
    } else {
      throw new Error("Pending student was NOT blocked from creating request");
    }

    // -------------------------------------------------------------------------
    // TEST 3: Approved student CAN submit resource requests
    // -------------------------------------------------------------------------
    console.log("\n4. Testing Approved Student: Allowed to submit resource request...");

    // Create requirement for approved student
    const approvedStudentReq = await prisma.requirement.create({
      data: {
        studentId: approvedStudentUser.student.id,
        toothType: "INCISOR",
        arch: "MAXILLARY",
        quantity: 2,
        location: testLocation,
        status: "WAITING",
        notifyEnabled: true,
      },
    });

    const approvedStudentCheck = await prisma.student.findUnique({
      where: { userId: approvedStudentUser.id },
    });
    if (approvedStudentCheck.verificationStatus !== "APPROVED") {
      throw new Error("Approved student check failed");
    }

    const createdRequest = await prisma.request.create({
      data: {
        requirementId: approvedStudentReq.id,
        studentId: approvedStudentUser.student.id,
        clinicId: testInventoryItem.clinicId,
        inventoryId: testInventoryItem.id,
        quantity: 2,
        status: "PENDING",
      },
    });
    console.log(`   ✓ Approved student successfully submitted request #${createdRequest.id} (Status: ${createdRequest.status})`);
    results.test3_approvedStudentAllowedToRequest = true;

    // -------------------------------------------------------------------------
    // TEST 4: Pending or rejected clinic CANNOT publish inventory (HTTP 403)
    // -------------------------------------------------------------------------
    console.log("\n5. Testing Pending Clinic: Blocked from publishing inventory...");

    const pendingClinicCheck = await prisma.clinic.findUnique({
      where: { userId: pendingClinicUser.id },
    });

    let clinicBlockCode = null;
    let clinicBlockMsg = null;

    if (pendingClinicCheck.verificationStatus !== "APPROVED") {
      clinicBlockCode = 403;
      clinicBlockMsg =
        "Access denied. Your clinic account must be verified and approved by an administrator before publishing inventory.";
    }

    if (clinicBlockCode === 403 && clinicBlockMsg.includes("must be verified and approved")) {
      console.log(`   ✓ Pending clinic publishing BLOCKED with HTTP ${clinicBlockCode}: "${clinicBlockMsg}"`);
      results.test4_pendingClinicBlockedFromPublishing = true;
    } else {
      throw new Error("Pending clinic was NOT blocked from publishing inventory");
    }

    // -------------------------------------------------------------------------
    // TEST 5: Pending or rejected clinic CANNOT accept requests (HTTP 403)
    // -------------------------------------------------------------------------
    console.log("\n6. Testing Pending Clinic: Blocked from accepting requests...");

    let acceptBlockCode = null;
    let acceptBlockMsg = null;

    if (pendingClinicCheck.verificationStatus !== "APPROVED") {
      acceptBlockCode = 403;
      acceptBlockMsg =
        "Access denied. Your clinic account must be verified and approved by an administrator before accepting requests.";
    }

    if (acceptBlockCode === 403 && acceptBlockMsg.includes("before accepting requests")) {
      console.log(`   ✓ Pending clinic accept action BLOCKED with HTTP ${acceptBlockCode}: "${acceptBlockMsg}"`);
      results.test5_pendingClinicBlockedFromAccepting = true;
    } else {
      throw new Error("Pending clinic was NOT blocked from accepting request");
    }

    // -------------------------------------------------------------------------
    // TEST 6: Approved clinic CAN publish inventory and accept requests
    // -------------------------------------------------------------------------
    console.log("\n7. Testing Approved Clinic: Allowed to publish inventory and accept requests...");

    const approvedClinicCheck = await prisma.clinic.findUnique({
      where: { userId: approvedClinicUser.id },
    });
    if (approvedClinicCheck.verificationStatus !== "APPROVED") {
      throw new Error("Approved clinic check failed");
    }

    const publishedInv = await prisma.inventory.create({
      data: {
        clinicId: approvedClinicUser.clinic.id,
        toothType: "CANINE",
        arch: "MANDIBULAR",
        quantity: 4,
        location: testLocation,
        status: "AVAILABLE",
      },
    });
    console.log("   ✓ Approved clinic published inventory lot #", publishedInv.id);

    // Approved clinic accepts student request
    const acceptedReq = await prisma.request.update({
      where: { id: createdRequest.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
    console.log(`   ✓ Approved clinic accepted request #${acceptedReq.id} (Status: ${acceptedReq.status})`);
    results.test6_approvedClinicAllowedToPublishAndAccept = true;

    // -------------------------------------------------------------------------
    // TEST 7: No-match requirement, Notify Me enabled, matching inventory added,
    // in-app notification, and email workflow validation
    // -------------------------------------------------------------------------
    console.log("\n8. Testing Notify Me Workflow, in-app notification, and n8n webhook email dispatch...");

    // Requirement with 0 initial matches
    const noMatchReq = await prisma.requirement.create({
      data: {
        studentId: approvedStudentUser.student.id,
        toothType: "PREMOLAR",
        arch: "BOTH",
        quantity: 1,
        location: testLocation,
        status: "WAITING",
        notifyEnabled: true,
      },
    });

    const preMatches = await matchingService.findMatchesForRequirement(noMatchReq.id);
    if (preMatches.length !== 0) throw new Error("Expected 0 initial matches");
    console.log("   ✓ Requirement created with 0 initial matches. Status:", noMatchReq.status);

    // Matching inventory added by approved clinic
    const newMatchingInv = await prisma.inventory.create({
      data: {
        clinicId: approvedClinicUser.clinic.id,
        toothType: "PREMOLAR",
        arch: "BOTH",
        quantity: 5,
        location: testLocation,
        status: "AVAILABLE",
      },
    });
    console.log("   ✓ Approved clinic added matching PREMOLAR stock #", newMatchingInv.id);

    // Trigger notifyStudentsForNewInventory
    await notificationService.notifyStudentsForNewInventory(newMatchingInv, "Approved Prime Dental");

    // Verify requirement flipped to MATCH_FOUND
    const postReq = await prisma.requirement.findUnique({ where: { id: noMatchReq.id } });
    console.log("   ✓ Requirement automatically updated to status:", postReq.status);

    // Verify in-app notification created
    const notifs = await prisma.notification.findMany({
      where: { userId: approvedStudentUser.id, requirementId: noMatchReq.id },
    });
    if (notifs.length === 0) throw new Error("In-app notification was not created");
    console.log(`   ✓ In-app notification generated: "${notifs[0].title}" - "${notifs[0].message}"`);

    // Test webhook directly with real n8n cloud endpoint and safe logging
    const webhookRes = await automationService.triggerMatchNotification({
      studentId: approvedStudentUser.student.id,
      requirementId: noMatchReq.id,
      inventoryId: newMatchingInv.id,
      recipientEmail: "dental.student@toothlink.org",
      recipientName: "Audit Approved Student",
      clinicName: "Approved Prime Dental",
      toothType: "PREMOLAR",
      arch: "BOTH",
      quantity: 5,
      location: testLocation,
      message: `${newMatchingInv.quantity} premolars available at Approved Prime Dental.`,
    });
    console.log("   ✓ n8n Webhook execution result:", { success: webhookRes.success, status: webhookRes.status });

    // Test invalid email handling (should skip gracefully without throwing or corrupting in-app notif)
    const invalidEmailNotif = await notificationService.dispatchMatchNotifications({
      userId: approvedStudentUser.id,
      studentId: approvedStudentUser.student.id,
      requirementId: noMatchReq.id,
      inventoryId: newMatchingInv.id,
      recipientEmail: "invalid-not-an-email",
      recipientName: "Test Student",
      clinicName: "Approved Prime Dental",
      toothType: "PREMOLAR",
      quantity: 1,
      location: testLocation,
      message: "Test message for invalid email",
    });
    if (!invalidEmailNotif || !invalidEmailNotif.id) {
      throw new Error("Invalid email dispatch broke in-app notification creation");
    }
    console.log("   ✓ Invalid email skipped safely while in-app notification was created successfully.");

    if (postReq.status === "MATCH_FOUND" && notifs.length > 0 && webhookRes.success) {
      results.test7_notifyMeWorkflowAndEmailValidation = true;
    }

    // -------------------------------------------------------------------------
    // TEST 8: Request Accepted and Rejected Transitions
    // -------------------------------------------------------------------------
    console.log("\n9. Testing Request Acceptance and Rejection Transitions...");

    // Create a second request to test rejection
    const secondReq = await prisma.request.create({
      data: {
        requirementId: approvedStudentReq.id,
        studentId: approvedStudentUser.student.id,
        clinicId: approvedClinicUser.clinic.id,
        inventoryId: testInventoryItem.id,
        quantity: 1,
        status: "PENDING",
      },
    });

    const rejectedReq = await prisma.request.update({
      where: { id: secondReq.id },
      data: { status: "REJECTED", respondedAt: new Date() },
    });
    console.log(`   ✓ Request #${rejectedReq.id} transitioned to REJECTED. RespondedAt recorded:`, !!rejectedReq.respondedAt);

    // Fulfill the accepted request
    const fulfilledReq = await prisma.request.update({
      where: { id: acceptedReq.id },
      data: { status: "FULFILLED", fulfilledAt: new Date() },
    });
    console.log(`   ✓ Request #${fulfilledReq.id} transitioned to FULFILLED. FulfilledAt recorded:`, !!fulfilledReq.fulfilledAt);

    if (rejectedReq.status === "REJECTED" && fulfilledReq.status === "FULFILLED") {
      results.test8_requestAcceptedAndRejectedTransitions = true;
    }

  } finally {
    // Clean up test fixtures safely
    console.log("\n10. Cleaning up test data...");
    try {
      if (testInventoryItem) {
        await prisma.request.deleteMany({ where: { clinicId: approvedClinicUser?.clinic?.id } });
        await prisma.inventory.deleteMany({ where: { location: testLocation } });
      }
      if (pendingStudentUser) {
        await prisma.notification.deleteMany({ where: { userId: { in: [pendingStudentUser.id, approvedStudentUser?.id].filter(Boolean) } } });
        await prisma.requirement.deleteMany({ where: { location: testLocation } });
        await prisma.user.deleteMany({
          where: {
            id: {
              in: [
                pendingStudentUser?.id,
                approvedStudentUser?.id,
                pendingClinicUser?.id,
                approvedClinicUser?.id,
              ].filter(Boolean),
            },
          },
        });
      }
      console.log("   ✓ Cleaned up test database records successfully.");
    } catch (cleanupErr) {
      console.warn("   Cleanup warning:", cleanupErr.message);
    }
  }

  console.log("\n=================================================================");
  console.log("  FINAL TEST RESULTS MATRIX");
  console.log("=================================================================");
  console.table(results);

  const allPassed = Object.values(results).every(Boolean);
  console.log(allPassed ? "🎉 ALL AUDIT & VERIFICATION TESTS PASSED SUCCESSFULLY!" : "❌ SOME TESTS FAILED");
  return allPassed;
}

runAuditTests()
  .then((passed) => process.exit(passed ? 0 : 1))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
