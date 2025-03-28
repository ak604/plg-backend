import express from 'express';
import { rewardCurrency } from '../controllers/adminController';

const router = express.Router();

/**
 * @swagger
 * /api/admin/reward-currency:
 *   post:
 *     summary: Reward currency to a user (Admin)
 *     description: >
 *       Adds a specified amount of a given currency to a user's balance.
 *       This is an administrative endpoint and should be protected appropriately.
 *       The currency map is automatically initialized if it doesn't exist.
 *       Currency balances are updated atomically.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - currency
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The unique ID of the user to reward.
 *                 example: user123
 *               currency:
 *                 type: string
 *                 description: The currency symbol (e.g., 'POINTS', 'USD', 'PLT'). Case-insensitive, will be stored uppercase.
 *                 example: POINTS
 *               amount:
 *                 type: number
 *                 format: double
 *                 description: The positive amount of currency to add.
 *                 example: 100.50
 *     responses:
 *       200:
 *         description: Currency successfully rewarded. Returns the updated user object.
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
 *                   example: Successfully rewarded 100.5 POINTS to user user123.
 *                 data:
 *                   $ref: '#/components/schemas/User' # Assuming User schema is defined globally
 *       400:
 *         description: Bad Request - Missing required fields, invalid amount, or invalid currency.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error' # Assuming Error schema defined globally
 *       404:
 *         description: Not Found - The specified user ID was not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal Server Error - Failed to update the user's balance in the database.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/reward-currency', rewardCurrency);

export default router; 