/**
 * Helper to calculate the unified display status of a change request.
 * Maps backend status values to consistent human-readable frontend statuses.
 * 
 * Possible return values:
 * - 'Rejected': If rejected at any stage (HOD, L2 validation, or L3 approvals)
 * - 'Closed': If successfully completed/closed at L3
 * - 'Approved': If L2 validation accepted, now in L3 approvals phase
 * - 'Pending L2': If HOD approved, awaiting requester L2 submission/QA verification
 * - 'Pending L1 HOD': Newly created request awaiting HOD approvals
 */
export const getRequestDisplayStatus = (c) => {
  // 1. Immediate rejection at L1 HOD or L2 Validation level
  if (c.hodStatus === 'Rejected' || c.l2Status === 'Rejected') {
    return 'Rejected';
  }

  // 2. Final L3 Rejection (only when ALL departments have voted/completed, and at least one is Rejected)
  if (c.hasL3Rejection && c.isL3Complete) {
    return 'Rejected';
  }

  // 3. Fully Completed / Closed / Approved
  if (c.status === 'Completed') {
    return 'Closed';
  }
  if (c.l3Status === 'Approved' || (c.isL3Complete && !c.hasL3Rejection)) {
    return 'Approved';
  }

  // 4. Pending L3 (L3 is in progress, waiting for all departments)
  if (c.status === 'Approved' || (c.hodStatus === 'Approved' && c.l2Status === 'Accepted')) {
    return 'Pending L3';
  }

  // 5. Pending L2
  if (c.hodStatus === 'Approved') {
    return 'Pending L2';
  }

  // 6. Pending L1 HOD
  return 'Pending L1 HOD';
};
