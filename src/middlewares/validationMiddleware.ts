import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import blockchainService from '../services/blockchainService';

// Validation middleware for token reward endpoint
export const validateRewardTokens = [
  query('token')
    .isString()
    .notEmpty()
    .withMessage('Token address is required')
    .custom((value) => {
      if (!blockchainService.isValidAddress(value)) {
        throw new Error('Invalid Ethereum token address');
      }
      return true;
    }),
  query('amount')
    .isString()
    .notEmpty()
    .withMessage('Amount is required')
    .custom((value) => {
      const amountNum = parseFloat(value);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Amount must be a positive number');
      }
      return true;
    }),
  query('userId')
    .isString()
    .notEmpty()
    .withMessage('User ID is required'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array(),
      });
    }
    next();
  },
];

// Validation middleware for linking wallet endpoint
export const validateLinkWallet = [
  body('userId')
    .isString()
    .notEmpty()
    .withMessage('User ID is required'),
  body('walletAddress')
    .isString()
    .notEmpty()
    .withMessage('Wallet address is required')
    .custom((value) => {
      if (!blockchainService.isValidAddress(value)) {
        throw new Error('Invalid Ethereum wallet address');
      }
      return true;
    }),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array(),
      });
    }
    next();
  },
];

// Validation middleware for getting user wallet endpoint
export const validateGetUserWallet = [
  param('userId')
    .isString()
    .notEmpty()
    .withMessage('User ID is required'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array(),
      });
    }
    next();
  },
]; 