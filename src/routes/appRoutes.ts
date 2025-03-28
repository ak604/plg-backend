import express from 'express';
import { loadAndGenerateWallets } from '../controllers/appController';

const router = express.Router();

/**
 * @swagger
 * /api/app/load:
 *   get:
 *     summary: Load user and generate EVM wallet if missing
 *     description: >
 *       Fetches a user by their ID. If the user exists but does not have a
 *       walletAddress associated with them, a new EVM-compatible wallet address
 *       is generated and saved for the user. If the user already has an address,
 *       or if the user is not found, appropriate status is returned.
 *     tags: [App]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the user to process.
 *     responses:
 *       200:
 *         description: Successfully processed the user. Returns the user's details, including the potentially newly generated wallet address or existing address.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Successfully generated and saved new wallet address for user user123. OR User user123 already has a wallet address. No update needed.
 *                 userId:
 *                   type: string
 *                   example: user123
 *                 walletAddress:
 *                   type: string
 *                   example: 0x1234567890abcdef1234567890abcdef12345678
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2023-10-27T10:00:00.000Z
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2023-10-27T10:00:00.000Z
 *       400:
 *         description: Bad Request - Missing required 'userId' query parameter.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: 'Missing required query parameter: userId'
 *       404:
 *         description: Not Found - The user with the specified ID was not found in the database.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: User with ID user123 not found.
 *       500:
 *         description: Internal Server Error - An error occurred while fetching the user or updating the wallet.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Failed to process request for user user123.
 *                 details:
 *                   type: string
 *                   example: DynamoDB read/write error message
 */
router.get('/load', loadAndGenerateWallets);

export default router; 