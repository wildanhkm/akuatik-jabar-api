// types/user.types.ts
import { User } from '@prisma/client';

// Type for user selection (fields we want to return)
export type SafeUser = Omit<User, 'password' | 'passwordResetToken' | 'passwordResetExpires'>;

// Type for user creation
export type CreateUserInput = Pick<User, 'email' | 'username' | 'role'> & {
  password: string;
  isActive?: boolean;
};

// Type for user update
export type UpdateUserInput = Partial<CreateUserInput>;
