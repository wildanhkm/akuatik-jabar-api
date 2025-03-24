import { Router } from 'express';
import {
  bulkImportUsers,
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from '../controllers/userController';

const router = Router();

router.post('/', createUser);
router.post('/bulk-import', bulkImportUsers);
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
