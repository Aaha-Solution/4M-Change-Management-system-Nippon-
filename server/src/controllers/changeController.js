import * as changeModel from '../models/changeModel.js';
import pool from '../config/db.js';

export const getAllChanges = async (req, res) => {
  try {
    const list = await changeModel.getChanges();
    res.status(200).json(list);
  } catch (error) {
    console.error('Error in getAllChanges:', error);
    res.status(500).json({ error: 'Failed to fetch changes' });
  }
};

export const createChange = async (req, res) => {
  const { title, requester, priority } = req.body;

  if (!title || !requester) {
    return res.status(400).json({ error: 'Title and Requester are required fields.' });
  }

  try {
    const newChange = await changeModel.addChange(title, requester, priority);
    res.status(201).json({
      message: 'Change request created successfully',
      change: newChange
    });
  } catch (error) {
    console.error('Error in createChange:', error);
    res.status(500).json({ error: 'Failed to create change request' });
  }
};

export const updateChangeStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  try {
    const updated = await changeModel.updateChangeStatus(id, status);
    res.status(200).json({
      message: 'Change request status updated successfully',
      change: updated
    });
  } catch (error) {
    console.error('Error in updateChangeStatus:', error);
    res.status(500).json({ error: 'Failed to update change request status' });
  }
};

export const createL1Request = async (req, res) => {
  const { l1Data, attachments } = req.body;
  const userEmail = req.user?.email || 'unknown@cms.com';

  if (!l1Data || !l1Data.changeNo || !l1Data.unit || !l1Data.dept || !l1Data.context || !l1Data.description) {
    return res.status(400).json({ error: 'Required L1 change request data fields are missing.' });
  }

  try {
    const newChange = await changeModel.addL1Request(l1Data, attachments, userEmail);
    res.status(201).json({
      message: 'L1 Change request created successfully',
      change: newChange
    });
  } catch (error) {
    console.error('Error in createL1Request:', error);
    res.status(500).json({ error: 'Failed to save L1 request to the database.' });
  }
};

export const getL2ValidationLogs = async (req, res) => {
  try {
    const logs = await changeModel.getL2ValidationLogs();
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error in getL2ValidationLogs:', error);
    res.status(500).json({ error: 'Failed to fetch L2 validation logs' });
  }
};

export const createL2ValidationLog = async (req, res) => {
  const { logData, attachments } = req.body;
  const userEmail = req.user?.email;

  if (!logData || !logData.changeNo || !logData.date || !logData.requester || !logData.status || !logData.remarks) {
    return res.status(400).json({ error: 'Required L2 validation log data fields are missing.' });
  }

  try {
    if (userEmail) {
      const [userRows] = await pool.query('SELECT department, role FROM users WHERE email = ?', [userEmail]);
      if (userRows.length > 0) {
        const user = userRows[0];
        const dept = (user.department || '').toLowerCase();
        const role = (user.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'administrator' && dept !== 'quality' && dept !== 'qad' && dept !== 'qa') {
          return res.status(403).json({ error: 'Access Denied: L2 validation is restricted to Quality department team members only.' });
        }
      }

      // Check if user is the requester of this change request
      const [changeRows] = await pool.query('SELECT requester FROM change_requests WHERE id = ?', [logData.changeNo]);
      if (changeRows.length > 0) {
        const changeRequester = changeRows[0].requester;
        if (changeRequester && changeRequester.toLowerCase() === userEmail.toLowerCase()) {
          return res.status(403).json({ error: 'Access Denied: You cannot perform L2 validation on a change request that you raised.' });
        }
      }
    }

    const newLog = await changeModel.addL2ValidationLog(logData, attachments);
    res.status(201).json({
      message: 'L2 Validation log created successfully',
      log: newLog
    });
  } catch (error) {
    console.error('Error in createL2ValidationLog:', error);
    if (error.message && error.message.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to save L2 validation log to database.' });
  }
};

export const getL3Approvals = async (req, res) => {
  try {
    const approvals = await changeModel.getL3Approvals();
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
    const newLog = await changeModel.addL3ApprovalLog(logData);
    res.status(201).json({
      message: 'L3 Approval log created/updated successfully',
      log: newLog
    });
  } catch (error) {
    console.error('Error in createL3Approval:', error);
    res.status(500).json({ error: 'Failed to save L3 approval log to database.' });
  }
};

export const getNextChangeNo = async (req, res) => {
  try {
    const nextNo = await changeModel.getNextChangeNo();
    res.status(200).json({ nextNo });
  } catch (error) {
    console.error('Error in getNextChangeNo:', error);
    res.status(500).json({ error: 'Failed to calculate next change number.' });
  }
};

export const getL1AttachmentFile = async (req, res) => {
  const { changeNo, fileName } = req.params;

  try {
    const file = await changeModel.getL1Attachment(changeNo, fileName);
    if (!file) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const fileBuffer = Buffer.from(file.data, 'base64');
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error in getL1AttachmentFile:', error);
    res.status(500).json({ error: 'Failed to retrieve attachment file' });
  }
};

export const getL1Details = async (req, res) => {
  const { changeNo } = req.params;

  try {
    const details = await changeModel.getL1Details(changeNo);
    if (!details) {
      return res.status(404).json({ error: 'L1 change request not found' });
    }
    res.status(200).json(details);
  } catch (error) {
    console.error('Error in getL1Details controller:', error);
    res.status(500).json({ error: 'Failed to fetch L1 request details' });
  }
};

export const getL2Details = async (req, res) => {
  const { changeNo } = req.params;

  try {
    const details = await changeModel.getL2Details(changeNo);
    if (!details) {
      return res.status(404).json({ error: 'L2 validation log not found' });
    }
    res.status(200).json(details);
  } catch (error) {
    console.error('Error in getL2Details controller:', error);
    res.status(500).json({ error: 'Failed to fetch L2 validation details' });
  }
};

export const getL2AttachmentFile = async (req, res) => {
  const { changeNo, fileName } = req.params;

  try {
    const file = await changeModel.getL2Attachment(changeNo, fileName);
    if (!file) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const fileBuffer = Buffer.from(file.data, 'base64');
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error in getL2AttachmentFile:', error);
    res.status(500).json({ error: 'Failed to retrieve L2 attachment file' });
  }
};



