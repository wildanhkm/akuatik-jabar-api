import express, { Express, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/error';
import { authRoutes, eventRoutes, publicRoutes, userRoutes } from './routes';
import { authenticateToken } from './middlewares/auth';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(errorHandler);

// Public Route
app.use('/api/v1/public/kejurkab', publicRoutes);

// Protected Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authenticateToken, userRoutes);
app.use('/api/v1/events', authenticateToken, eventRoutes);
app.use('/api/v1/file-upload', authenticateToken, eventRoutes);
// TODO: add more routes for events and starting list
// TODO: add more routes for invoices and invoices should use distribute locking mechanism
// TODO: add more routes to integrate with KONI?

// Health check endpoint
app.get('/health', (_, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
