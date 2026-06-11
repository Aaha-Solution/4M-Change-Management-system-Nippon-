import * as l2Model from '../models/l2Model.js';
import pool from '../config/db.js';

export const getL2ValidationLogs = async (req, res) => {
  try {
    const logs = await l2Model.getL2ValidationLogs();
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
    // Access control: allow Quality/Admin OR the person who raised the change request
    if (userEmail) {
      const [userRows] = await pool.query('SELECT department, role FROM users WHERE email = ?', [userEmail]);
      if (userRows.length > 0) {
        const user = userRows[0];
        const dept = (user.department || '').toLowerCase();
        const role = (user.role || '').toLowerCase();
        const isQualityOrAdmin =
          role === 'admin' || role === 'administrator' ||
          dept === 'quality' || dept === 'qad' || dept === 'qa';

        if (!isQualityOrAdmin) {
          const [crRows] = await pool.query(
            'SELECT requester FROM change_requests WHERE id = ?',
            [logData.changeNo]
          );
          const isRequester =
            crRows.length > 0 &&
            crRows[0].requester?.toLowerCase().trim() === userEmail.toLowerCase().trim();

          if (!isRequester) {
            return res.status(403).json({
              error: 'Access Denied: L2 validation can only be submitted by the person who raised the change request or Quality department members.'
            });
          }
        }
      }
    }

    const newLog = await l2Model.addL2ValidationLog(logData, attachments);
    res.status(201).json({ message: 'L2 Validation log created successfully', log: newLog });
  } catch (error) {
    console.error('Error in createL2ValidationLog:', error);
    if (error.message && error.message.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to save L2 validation log to database.' });
  }
};

export const getL2Details = async (req, res) => {
  const { changeNo } = req.params;
  try {
    const details = await l2Model.getL2Details(changeNo);
    if (!details) {
      return res.status(404).json({ error: 'L2 validation log not found' });
    }
    res.status(200).json(details);
  } catch (error) {
    console.error('Error in getL2Details:', error);
    res.status(500).json({ error: 'Failed to fetch L2 validation details' });
  }
};

export const getL2AttachmentFile = async (req, res) => {
  const { changeNo, fileName } = req.params;
  try {
    const file = await l2Model.getL2Attachment(changeNo, fileName);
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
