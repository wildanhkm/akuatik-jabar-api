import { body, query } from 'express-validator';

export const validateEmail = (field: string, optional = false) => {
  const validator = body(field)
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail();
  return optional ? validator.optional() : validator;
};

export const validateEmailQueryParam = (field: string, optional = false) => {
  const validator = query(field)
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail();
  return optional ? validator.optional() : validator;
};

export const validateEmailArray = (field: string, optional = false) => {
  const validator = body(field)
    .isArray()
    .withMessage('Must be an array of emails')
    .custom((emails: string[]) => {
      return emails.every((email) => {
        if (typeof email !== 'string') return false;
        // Simple regex check - more thorough validation happens in normalize/validation chain
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      });
    })
    .withMessage('All elements must be valid email addresses')
    .customSanitizer((emails: string[]) => {
      return emails.map((email) => email.trim().toLowerCase());
    });
  return optional ? validator.optional() : validator;
};
