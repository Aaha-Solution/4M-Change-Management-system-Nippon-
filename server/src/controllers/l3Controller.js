import * as l3Model from '../models/l3Model.js';

export const getL3Approvals = async (req, res) => {
  try {
    const approvals = await l3Model.getL3Approvals();
    res.status(200).json(approvals);
  } catch (error) {
    console.error('Error in getL3Approvals:', error);
    res.status(500).json({ error: 'Failed to fetch L3 approvals' });
  }
};

export const createL3Approval = async (req, res) => {
  const { logData } = req.body;
  if (!logData || !logData.changeNo || !logData.date || !logData.requester) {
    return res.status(400).json({ error: 'Required L3 approval data fields are missing.' });
  }
  try {
    const newLog = await l3Model.addL3ApprovalLog(logData);
    res.status(201).json({ message: 'L3 Approval log created/updated successfully', log: newLog });
  } catch (error) {
    console.error('Error in createL3Approval:', error);
    res.status(500).json({ error: 'Failed to save L3 approval log to database.' });
  }
};
