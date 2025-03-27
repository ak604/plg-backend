import { Request, Response } from 'express';
import blockchainService from '../services/blockchainService';
import userStore from '../models/User';

/**
 * Controller for rewarding a user with crypto tokens
 * @param req - Express request object
 * @param res - Express response object
 */
export const rewardTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, amount, userId } = req.query;

    // Validate required parameters
    if (!token || !amount || !userId) {
      res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: token, amount, userId',
      });
      return;
    }

    // Check if token is a valid ERC20 token address
    if (!blockchainService.isValidAddress(token as string)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid token address',
      });
      return;
    }

    // Check if amount is a valid number
    if (isNaN(parseFloat(amount as string)) || parseFloat(amount as string) <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Amount must be a positive number',
      });
      return;
    }

    // Get user information to find the wallet address
    const user = userStore.getUserById(userId as string);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: `User with ID ${userId} not found or wallet not linked`,
      });
      return;
    }

    // Check if admin has sufficient balance
    const hasSufficientBalance = await blockchainService.hasAdminSufficientBalance(
      token as string,
      amount as string
    );

    if (!hasSufficientBalance) {
      res.status(400).json({
        status: 'error',
        message: 'Insufficient tokens in admin wallet',
      });
      return;
    }

    // Transfer tokens from admin wallet to user wallet
    const receipt = await blockchainService.transferTokens(
      token as string,
      user.walletAddress,
      amount as string
    );

    // Get token info for the response
    const tokenInfo = await blockchainService.getTokenInfo(token as string);

    res.status(200).json({
      status: 'success',
      message: 'Tokens successfully transferred',
      data: {
        userId: user.userId,
        recipient: user.walletAddress,
        amount,
        token: {
          address: token,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol
        },
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      },
    });
  } catch (error) {
    console.error('Error in rewardTokens:', error);
    res.status(500).json({
      status: 'error',
      message: (error as Error).message || 'Failed to transfer tokens',
    });
  }
};

/**
 * Controller for linking a user ID with a wallet address
 * @param req - Express request object
 * @param res - Express response object
 */
export const linkWallet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, walletAddress } = req.body;

    // Validate required parameters
    if (!userId || !walletAddress) {
      res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: userId, walletAddress',
      });
      return;
    }

    // Validate wallet address
    if (!blockchainService.isValidAddress(walletAddress)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid Ethereum wallet address',
      });
      return;
    }

    // Link user ID with wallet address
    const user = userStore.linkWallet(userId, walletAddress);

    res.status(200).json({
      status: 'success',
      message: 'Wallet successfully linked to user',
      data: user,
    });
  } catch (error) {
    console.error('Error in linkWallet:', error);
    res.status(500).json({
      status: 'error',
      message: (error as Error).message || 'Failed to link wallet',
    });
  }
};

/**
 * Controller for getting user wallet information
 * @param req - Express request object
 * @param res - Express response object
 */
export const getUserWallet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'Missing required parameter: userId',
      });
      return;
    }

    const user = userStore.getUserById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: `User with ID ${userId} not found or wallet not linked`,
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    console.error('Error in getUserWallet:', error);
    res.status(500).json({
      status: 'error',
      message: (error as Error).message || 'Failed to get user wallet information',
    });
  }
}; 