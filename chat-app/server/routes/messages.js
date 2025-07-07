import express from 'express';
import Message from '../models/Message';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { roomId, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const messages = await Message.find({ roomId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Message.countDocuments({ roomId });
    
    res.json({
      messages,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;