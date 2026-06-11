import * as allRequestsModel from '../models/allRequestsModel.js';

export const getAllChanges = async (req, res) => {
  try {
    const list = await allRequestsModel.getChanges();
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
    const newChange = await allRequestsModel.addChange(title, requester, priority);
    res.status(201).json({ message: 'Change request created successfully', change: newChange });
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
    const updated = await allRequestsModel.updateChangeStatus(id, status);
    res.status(200).json({ message: 'Change request status updated successfully', change: updated });
  } catch (error) {
    console.error('Error in updateChangeStatus:', error);
    res.status(500).json({ error: 'Failed to update change request status' });
  }
};
