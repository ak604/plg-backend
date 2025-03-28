import { Request, Response } from 'express';
import { userStore } from '../models/User';
import { isNumeric } from '../utils/validation'; // Assuming a utility function exists or can be created

/**
 * @description Rewards a specified amount of a currency to a user.
 *              Expects userId, currency, and amount in the request body.
 * @route POST /admin/reward-currency
 */
export const rewardCurrency = async (req: Request, res: Response): Promise<void> => {
    const { userId, currency, amount } = req.body;

    // 1. Validate input
    if (!userId || !currency || amount === undefined) {
        res.status(400).json({
            status: 'error',
            message: 'Missing required fields: userId, currency, and amount.',
        });
        return;
    }

    if (typeof currency !== 'string' || currency.trim() === '') {
         res.status(400).json({
            status: 'error',
            message: 'Invalid currency symbol provided.',
        });
        return;
    }

    if (!isNumeric(amount) || Number(amount) <= 0) {
        res.status(400).json({
            status: 'error',
            message: 'Amount must be a positive number.',
        });
        return;
    }

    const amountToAdd = Number(amount);
    const currencySymbol = currency.trim().toUpperCase(); // Normalize currency symbol

    console.log(`Processing admin reward: User=${userId}, Currency=${currencySymbol}, Amount=${amountToAdd}`);

    try {
        // 2. Use the UserStore method to update the balance
        const updatedUser = await userStore.updateCurrencyBalance(userId, currencySymbol, amountToAdd);

        console.log(`Successfully rewarded ${amountToAdd} ${currencySymbol} to user ${userId}`);

        // 3. Respond with success and the updated user data
        res.status(200).json({
            status: 'success',
            message: `Successfully rewarded ${amountToAdd} ${currencySymbol} to user ${userId}.`,
            data: updatedUser, // Contains the full user object including updated currencyMap
        });

    } catch (error: any) {
        console.error(`Error rewarding currency for user ${userId}:`, error);

        // Handle specific errors like user not found
        if (error.message.includes(`User with ID ${userId} not found`)) {
             res.status(404).json({
                status: 'error',
                message: error.message,
            });
        } else if (error.message.includes('Amount must be positive') || error.message.includes('Currency symbol cannot be empty')) {
             res.status(400).json({ // Input validation error from store
                status: 'error',
                message: error.message,
            });
        } else {
            // General server error
            res.status(500).json({
                status: 'error',
                message: `Failed to reward currency for user ${userId}.`,
                details: error.message || 'Unknown server error',
            });
        }
    }
}; 