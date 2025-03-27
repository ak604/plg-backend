import express from 'express';
import {
  rewardTokens,
  linkWallet,
  getUserWallet,
} from '../controllers/cryptoController';
import {
  validateRewardTokens,
  validateLinkWallet,
  validateGetUserWallet,
} from '../middlewares/validationMiddleware';

// Create router
const router = express.Router();

/**
 * @swagger
 * /api/crypto/reward:
 *   get:
 *     summary: Reward a user with crypto tokens
 *     description: Transfer tokens from admin wallet to user wallet
 *     tags: [Crypto]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: ERC20 token contract address
 *         example: 0xabcdef1234567890abcdef1234567890abcdef12
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: string
 *         description: Amount of tokens to reward
 *         example: "10.5"
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to reward
 *         example: user123
 *     responses:
 *       200:
 *         description: Tokens successfully transferred
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenRewardResponse'
 *       400:
 *         description: Bad request - Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/reward', validateRewardTokens, rewardTokens);

/**
 * @swagger
 * /api/crypto/link-wallet:
 *   post:
 *     summary: Link a user ID with a wallet address
 *     description: Associate a user ID with an Ethereum wallet address
 *     tags: [Crypto]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - walletAddress
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: user123
 *               walletAddress:
 *                 type: string
 *                 description: Ethereum wallet address
 *                 example: 0x1234567890123456789012345678901234567890
 *     responses:
 *       200:
 *         description: Wallet successfully linked to user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LinkWalletResponse'
 *       400:
 *         description: Bad request - Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/link-wallet', validateLinkWallet, linkWallet);

/**
 * @swagger
 * /api/crypto/user/{userId}:
 *   get:
 *     summary: Get user wallet information
 *     description: Retrieve wallet information for a specific user
 *     tags: [Crypto]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: user123
 *     responses:
 *       200:
 *         description: User wallet information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/user/:userId', validateGetUserWallet, getUserWallet);

export const cryptoRoutes = router;

export default router; 