import express from 'express';
import { deleteClub, getClubById, getClubs, updateClubById } from '../controllers/clubController';

const router = express.Router();

router.post('/delete-club/:id', deleteClub);
router.get('/club/:id', getClubById);
router.get('/clubs', getClubs);
router.post('/update-club/:id', updateClubById);

export default router;
