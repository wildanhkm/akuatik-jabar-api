import { body, query } from 'express-validator';

// International phone number regex - supports:
// - Optional country code (+ prefix)
// - Optional parentheses for area codes
// - Spaces, dots, or dashes as separators
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

export const validatePhone = (field: string, optional = false) => {
  const validator = body(field)
    .trim()
    .matches(PHONE_REGEX)
    .withMessage('Must be a valid phone number')
    .isLength({ min: 6, max: 20 })
    .withMessage('Phone number must be between 6-20 characters')
    .customSanitizer((value: string) => {
      // Normalize phone number by removing all non-digit characters except leading +
      return value.replace(/[^\d+]/g, '');
    });
  return optional ? validator.optional() : validator;
};

export const validatePhoneQueryParam = (field: string, optional = false) => {
  const validator = query(field)
    .trim()
    .matches(PHONE_REGEX)
    .withMessage('Must be a valid phone number')
    .isLength({ min: 6, max: 20 })
    .withMessage('Phone number must be between 6-20 characters');
  return optional ? validator.optional() : validator;
};

export const validatePhoneArray = (field: string, optional = false) => {
  const validator = body(field)
    .isArray()
    .withMessage('Must be an array of phone numbers')
    .custom((phones: string[]) => {
      return phones.every((phone) => {
        if (typeof phone !== 'string') return false;
        return PHONE_REGEX.test(phone);
      });
    })
    .withMessage('All elements must be valid phone numbers');
  return optional ? validator.optional() : validator;
};
