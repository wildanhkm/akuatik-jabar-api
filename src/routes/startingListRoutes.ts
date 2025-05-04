import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllStartingLists,
  getStartingListById,
  createStartingList,
  updateStartingList,
  deleteStartingList,
  addParticipantToStartingList,
  removeParticipantFromStartingList,
  updateParticipantResults,
  updateStartingListStatus,
} from '../controllers/startingListController.js';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Validation middleware for creating/updating starting lists
const validateStartingList = [
  body('category').notEmpty().withMessage('Category is required'),
  body('age_group').optional(),
  body('gender').optional().isIn(['male', 'female']).withMessage('Gender must be male or female'),
  body('max_participants')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max participants must be a positive integer'),
  body('start_time').optional().isISO8601().withMessage('Start time must be a valid date'),
];

// Validation middleware for participant results
const validateParticipantResults = [
  body('participantId').isInt().withMessage('Participant ID must be an integer'),
  body('final_time').optional().isISO8601().withMessage('Final time must be a valid date'),
  body('position').optional().isInt({ min: 1 }).withMessage('Position must be a positive integer'),
];

// Get all starting lists for an event
router.get('/starting-list/:eventId', authenticateToken, getAllStartingLists);

// Get a specific starting list by ID
router.get('/starting-list/:eventId/:id', authenticateToken, getStartingListById);

// Create a new starting list
router.post(
  '/starting-list/:eventId',
  authenticateToken,
  // authorize(['official', 'admin']),
  validateStartingList,
  createStartingList
);

// Update a starting list
router.put(
  '/starting-list/:eventId/:id',
  authenticateToken,
  // authorize(['official', 'admin']),
  validateStartingList,
  updateStartingList
);

// Delete a starting list
router.delete(
  '/starting-list/:eventId/:id',
  authenticateToken,
  // authorize(['admin']),
  deleteStartingList
);

// Additional routes for managing participants in starting lists

// Add a participant to a starting list
router.post(
  '/starting-list/:eventId/:id/participants',
  authenticateToken,
  // authorize(['official', 'admin']),
  body('member_id').isInt().withMessage('Member ID must be an integer'),
  body('lane_number')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lane number must be a positive integer'),
  body('seed_time').optional().isISO8601().withMessage('Seed time must be a valid date'),
  addParticipantToStartingList
);

// Remove a participant from a starting list
router.delete(
  '/starting-list/:eventId/:id/participants',
  authenticateToken,
  // authorize(['official', 'admin']),
  body('participantId').isInt().withMessage('Participant ID must be an integer'),
  removeParticipantFromStartingList
);

// Update a participant's results
router.put(
  '/starting-list/:eventId/:id/results',
  authenticateToken,
  // authorize(['official', 'admin']),
  validateParticipantResults,
  updateParticipantResults
);

// Update a starting list's status
router.put(
  '/starting-list/:eventId/:id/status',
  authenticateToken,
  // authorize(['official', 'admin']),
  body('status').isIn(['scheduled', 'in_progress', 'completed']).withMessage('Invalid status'),
  updateStartingListStatus
);

export default router;
