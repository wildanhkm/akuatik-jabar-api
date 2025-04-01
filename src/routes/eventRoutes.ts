import express from 'express';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController';

const router = express.Router();

router.post('/create-event', createEvent);
router.post('/get', getEvents);
router.post('/get/:id', getEventById);
router.post('/update-event/:id', updateEvent);
router.post('/delete-event/:id', deleteEvent);

export default router;
