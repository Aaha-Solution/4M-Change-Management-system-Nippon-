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
  if (c.hodStatus === 'Rejected' || c.l2Status === 'Rejected' || c.l3Status === 'Rejected') {
    return 'Rejected';
  }
  if (c.status === 'Completed') {
    return 'Closed';
  }
  if (c.status === 'Approved' || c.l3Status === 'Approved') {
    return 'Approved';
  }
  if (c.hodStatus === 'Approved' && c.l2Status === 'Accepted') {
    return 'Pending L3';
  }
  if (c.hodStatus === 'Approved') {
    return 'Pending L2';
  }
  return 'Pending L1 HOD';
};
