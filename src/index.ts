import express, { Express, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/users', userRoutes);
// TODO: add more routes for events and starting list
// TODO: add more routes for authentication (login and reg)
// TODO: add more routes for invoices and invoices should use distribute locking mechanism
// TODO: add more routes to integrate with KONI?

// Health check endpoint
app.get('/health', (_, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
