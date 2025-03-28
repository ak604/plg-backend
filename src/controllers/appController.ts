import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { userStore } from '../models/User'; // Removed User import as it's inferred

/**
 * @description Fetches a user by userId, generates an EVM wallet if missing,
 *              and updates the user record.
 * @route GET /app/load?userId=<userId>
 */
export const loadAndGenerateWallets = async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId as string;

    // 1. Validate input
    if (!userId) {
        res.status(400).json({
            status: 'error',
            message: 'Missing required query parameter: userId',
        });
        return;
    }

    console.log(`Processing /app/load request for userId: ${userId}`);

    try {
        // 2. Fetch the specific user
        const user = await userStore.getUserById(userId);

        if (!user) {
            console.log(`User ${userId} not found.`);
            res.status(404).json({
                status: 'error',
                message: `User with ID ${userId} not found.`,
            });
            return;
        }

        // 3. Check if walletAddress exists
        if (user.walletAddress && user.walletAddress.trim() !== '') {
            console.log(`User ${userId} already has a wallet address: ${user.walletAddress}`);
            res.status(200).json({
                status: 'success',
                data: user,
            });
            return;
        }

        // 4. Generate wallet and update user
        console.log(`Generating new wallet address for user ${userId}...`);
        const wallet = ethers.Wallet.createRandom();
        const newAddress = wallet.address;

        // IMPORTANT: The private key (wallet.privateKey) is discarded.
        // Secure handling is required if the private key needs to be stored.

        // Use linkWallet to update the user, handles Put and timestamps
        const updatedUser = await userStore.linkWallet(user.userId, newAddress);
        console.log(`Successfully generated and saved new wallet address ${newAddress} for user ${userId}`);

        res.status(200).json({
            status: 'success',
            data: updatedUser,
        });

    } catch (error: any) {
        console.error(`Error processing /app/load for user ${userId}:`, error);
        res.status(500).json({
            status: 'error',
            message: `Failed to process request for user ${userId}.`,
            details: error.message || 'Unknown server error',
        });
    }
};

// Note on PLT Token Balance remains the same:
// Assigning token balance requires separate blockchain interaction. 