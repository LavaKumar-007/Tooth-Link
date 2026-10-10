const prisma = require("../utils/prisma");

/**
 * Calculates rule-based match score and explainable reasons for an inventory candidate.
 * Proposed MVP Rule weights:
 * - Tooth type: 35%
 * - Specific tooth / arch: 20% (Arch: 10%, Specific tooth: 10%)
 * - Condition: 15%
 * - Quantity: 15%
 * - Location: 10%
 * - Availability date: 5%
 * Total: 100%
 */
const calculateMatchScore = (requirement, item) => {
  const reasons = [];

  // 1. Tooth Type (35%)
  let toothTypeScore = 0;
  if (item.toothType === requirement.toothType) {
    toothTypeScore = 35;
    reasons.push(`Tooth type matched: ${item.toothType} (35/35)`);
  } else {
    reasons.push(`Tooth type mismatch: ${item.toothType} vs ${requirement.toothType} (0/35)`);
  }

  // 2. Specific Tooth / Arch (20%)
  // Arch (10%)
  let archScore = 0;
  if (item.arch === requirement.arch) {
    archScore = 10;
    reasons.push(`Exact arch match: ${item.arch} (10/10)`);
  } else if (item.arch === "BOTH") {
    archScore = 8;
    reasons.push(`Compatible arch match: BOTH covers ${requirement.arch} (8/10)`);
  } else {
    reasons.push(`Arch mismatch: ${item.arch} vs ${requirement.arch} (0/10)`);
  }

  // Specific Tooth (10%)
  let specificToothScore = 0;
  if (requirement.specificTooth && requirement.specificTooth.trim()) {
    if (item.specificTooth && item.specificTooth.trim()) {
      if (item.specificTooth.trim().toLowerCase() === requirement.specificTooth.trim().toLowerCase()) {
        specificToothScore = 10;
        reasons.push(`Exact specific tooth match: "${item.specificTooth}" (10/10)`);
      } else {
        specificToothScore = 2;
        reasons.push(`Different specific tooth: "${item.specificTooth}" vs requested "${requirement.specificTooth}" (2/10)`);
      }
    } else {
      specificToothScore = 5;
      reasons.push(`Unspecified tooth in inventory (5/10)`);
    }
  } else {
    specificToothScore = 10;
    reasons.push(`No specific tooth restriction requested (10/10)`);
  }

  const archAndToothScore = archScore + specificToothScore;

  // 3. Condition (15%)
  let conditionScore = 0;
  if (requirement.condition && requirement.condition.trim()) {
    if (item.condition && item.condition.trim()) {
      if (item.condition.trim().toLowerCase() === requirement.condition.trim().toLowerCase()) {
        conditionScore = 15;
        reasons.push(`Condition matched: "${item.condition}" (15/15)`);
      } else {
        conditionScore = 7;
        reasons.push(`Condition variance: "${item.condition}" vs preferred "${requirement.condition}" (7/15)`);
      }
    } else {
      conditionScore = 8;
      reasons.push(`Condition not recorded by clinic (8/15)`);
    }
  } else {
    conditionScore = 15;
    reasons.push(`Any condition acceptable (15/15)`);
  }

  // 4. Quantity (15%)
  let quantityScore = 0;
  if (item.quantity >= requirement.quantity) {
    quantityScore = 15;
    reasons.push(`Full quantity available: ${item.quantity} in stock for ${requirement.quantity} requested (15/15)`);
  } else {
    const ratio = item.quantity / requirement.quantity;
    quantityScore = Math.max(1, Math.round(ratio * 15));
    reasons.push(`Partial quantity available: ${item.quantity} of ${requirement.quantity} requested (${quantityScore}/15)`);
  }

  // 5. Location (10%)
  let locationScore = 0;
  if (item.location && requirement.location && item.location.trim().toLowerCase() === requirement.location.trim().toLowerCase()) {
    locationScore = 10;
    reasons.push(`Exact location match: "${item.location}" (10/10)`);
  } else {
    locationScore = 0;
    reasons.push(`Location mismatch: "${item.location}" vs "${requirement.location}" (0/10)`);
  }

  // 6. Availability date (5%)
  let dateScore = 0;
  if (requirement.requiredBy) {
    const reqDate = new Date(requirement.requiredBy);
    const hasFrom = Boolean(item.availableFrom);
    const hasUntil = Boolean(item.availableUntil);

    if (hasFrom && hasUntil) {
      dateScore = 5;
      reasons.push(`Available within requested timeline (${item.availableFrom.toISOString().slice(0, 10)} to ${item.availableUntil.toISOString().slice(0, 10)}) (5/5)`);
    } else if (hasUntil) {
      dateScore = 5;
      reasons.push(`Available until ${item.availableUntil.toISOString().slice(0, 10)}, after required deadline (5/5)`);
    } else {
      dateScore = 5;
      reasons.push(`Immediate availability covers deadline (5/5)`);
    }
  } else {
    dateScore = 5;
    reasons.push(`Open timeline / immediate availability (5/5)`);
  }

  const matchScore = Math.min(
    100,
    Math.max(0, toothTypeScore + archAndToothScore + conditionScore + quantityScore + locationScore + dateScore)
  );

  return {
    matchScore,
    matchReasons: reasons,
  };
};

/**
 * Finds matching inventory records for a requirement using transparent rule-based matching.
 *
 * Requirements for a strong MVP match:
 * - same toothType
 * - same arch OR inventory arch is BOTH
 * - inventory quantity > 0
 * - inventory status = AVAILABLE
 * - inventory location matches requirement location
 * - inventory available period overlaps the requirement's requiredBy date when dates exist
 *
 * @param {number|Object} requirementId - Requirement ID or Requirement object
 * @returns {Promise<Array>} Matching inventory records sorted by highest score
 */
const findMatchesForRequirement = async (requirementId) => {
  let requirement;
  if (typeof requirementId === "object" && requirementId !== null && requirementId.id) {
    requirement = requirementId;
  } else {
    const id = parseInt(requirementId, 10);
    if (isNaN(id)) {
      throw new Error("Invalid requirement ID");
    }
    requirement = await prisma.requirement.findUnique({
      where: { id },
    });
  }

  if (!requirement) {
    throw new Error("Requirement not found");
  }

  // Base query: AVAILABLE status, positive quantity, same toothType, compatible arch
  const candidateInventories = await prisma.inventory.findMany({
    where: {
      status: "AVAILABLE",
      quantity: { gt: 0 },
      toothType: requirement.toothType,
      arch: { in: [requirement.arch, "BOTH"] },
    },
    include: {
      clinic: {
        select: {
          id: true,
          clinicName: true,
          doctorName: true,
          location: true,
        },
      },
    },
  });

  const now = new Date();
  const normalizedReqLocation = requirement.location ? requirement.location.trim().toLowerCase() : "";

  // Apply location and date overlap filters
  const strongMatches = candidateInventories.filter((item) => {
    // 1. Location match (case-insensitive)
    const normalizedItemLocation = item.location ? item.location.trim().toLowerCase() : "";
    if (normalizedItemLocation !== normalizedReqLocation) {
      return false;
    }

    // 2. Not already expired as of today
    if (item.availableUntil && new Date(item.availableUntil) < now) {
      return false;
    }

    // 3. Date overlap with requiredBy when dates exist
    if (requirement.requiredBy) {
      const reqDate = new Date(requirement.requiredBy);

      // If inventory has availableFrom, it must be available on or before the requiredBy date
      if (item.availableFrom && new Date(item.availableFrom) > reqDate) {
        return false;
      }

      // If inventory has availableUntil, it must not end before the requiredBy date
      if (item.availableUntil && new Date(item.availableUntil) < reqDate) {
        return false;
      }
    }

    return true;
  });

  // Calculate explainable score and format return payload
  const scoredMatches = strongMatches.map((item) => {
    const { matchScore, matchReasons } = calculateMatchScore(requirement, item);

    return {
      inventoryId: item.id,
      clinicId: item.clinicId,
      clinicName: item.clinic?.clinicName || "Unknown Clinic",
      doctorName: item.clinic?.doctorName || null,
      toothType: item.toothType,
      specificTooth: item.specificTooth,
      arch: item.arch,
      condition: item.condition,
      quantity: item.quantity,
      location: item.location,
      availableFrom: item.availableFrom,
      availableUntil: item.availableUntil,
      status: item.status,
      matchScore,
      matchReasons,
    };
  });

  // Sort by highest matchScore descending
  scoredMatches.sort((a, b) => b.matchScore - a.matchScore);

  return scoredMatches;
};

module.exports = {
  findMatchesForRequirement,
  calculateMatchScore,
};
