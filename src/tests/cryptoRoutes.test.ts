import request from 'supertest';
import app from '../index';
import userStore from '../models/User';
import blockchainService from '../services/blockchainService';

// Mock the blockchain service
jest.mock('../services/blockchainService', () => ({
  isValidAddress: jest.fn().mockImplementation((address: string) => {
    return address.startsWith('0x') && address.length === 42;
  }),
  hasAdminSufficientBalance: jest.fn().mockResolvedValue(true),
  transferTokens: jest.fn().mockResolvedValue({
    transactionHash: '0x1234567890abcdef',
    blockNumber: 12345,
  }),
  getTokenInfo: jest.fn().mockResolvedValue({
    name: 'Test Token',
    symbol: 'TEST',
    decimals: 18,
  }),
  getAdminAddress: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890'),
}));

describe('Crypto API Endpoints', () => {
  // Reset mocks and clear user store before each test
  beforeEach(() => {
    jest.clearAllMocks();
    userStore.clearAllUsers();
  });

  describe('POST /api/crypto/link-wallet', () => {
    it('should link a wallet address to a user ID', async () => {
      const userData = {
        userId: 'user123',
        walletAddress: '0x1234567890123456789012345678901234567890',
      };

      const response = await request(app)
        .post('/api/crypto/link-wallet')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(userData);
      expect(blockchainService.isValidAddress).toHaveBeenCalledWith(
        userData.walletAddress
      );
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .post('/api/crypto/link-wallet')
        .send({
          walletAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should return 400 if walletAddress is missing', async () => {
      const response = await request(app).post('/api/crypto/link-wallet').send({
        userId: 'user123',
      });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should return 400 if walletAddress is invalid', async () => {
      const response = await request(app).post('/api/crypto/link-wallet').send({
        userId: 'user123',
        walletAddress: 'invalid-address',
      });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/crypto/user/:userId', () => {
    it('should return wallet information for a user', async () => {
      // First link a wallet
      const userData = {
        userId: 'user123',
        walletAddress: '0x1234567890123456789012345678901234567890',
      };

      await request(app).post('/api/crypto/link-wallet').send(userData);

      // Then get user wallet info
      const response = await request(app).get(
        `/api/crypto/user/${userData.userId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(userData);
    });

    it('should return 404 if user is not found', async () => {
      const response = await request(app).get('/api/crypto/user/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/crypto/reward', () => {
    it('should reward tokens to a user', async () => {
      // First link a wallet
      const userData = {
        userId: 'user123',
        walletAddress: '0x1234567890123456789012345678901234567890',
      };

      await request(app).post('/api/crypto/link-wallet').send(userData);

      // Then reward tokens
      const tokenAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
      const amount = '10.5';

      const response = await request(app).get(
        `/api/crypto/reward?token=${tokenAddress}&amount=${amount}&userId=${userData.userId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.userId).toBe(userData.userId);
      expect(response.body.data.recipient).toBe(userData.walletAddress);
      expect(response.body.data.amount).toBe(amount);
      expect(response.body.data.token.address).toBe(tokenAddress);
      expect(blockchainService.transferTokens).toHaveBeenCalledWith(
        tokenAddress,
        userData.walletAddress,
        amount
      );
    });

    it('should return 400 if token is missing', async () => {
      const response = await request(app).get(
        '/api/crypto/reward?amount=10&userId=user123'
      );

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should return 400 if amount is missing', async () => {
      const response = await request(app).get(
        '/api/crypto/reward?token=0xabcdef1234567890abcdef1234567890abcdef12&userId=user123'
      );

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app).get(
        '/api/crypto/reward?token=0xabcdef1234567890abcdef1234567890abcdef12&amount=10'
      );

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should return 400 if token address is invalid', async () => {
      const response = await request(app).get(
        '/api/crypto/reward?token=invalid-token&amount=10&userId=user123'
      );

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should return 400 if amount is not a positive number', async () => {
      const response = await request(app).get(
        '/api/crypto/reward?token=0xabcdef1234567890abcdef1234567890abcdef12&amount=-10&userId=user123'
      );

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should return 404 if user is not found', async () => {
      const response = await request(app).get(
        '/api/crypto/reward?token=0xabcdef1234567890abcdef1234567890abcdef12&amount=10&userId=nonexistent'
      );

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });

    it('should return 400 if admin has insufficient balance', async () => {
      // First link a wallet
      const userData = {
        userId: 'user123',
        walletAddress: '0x1234567890123456789012345678901234567890',
      };

      await request(app).post('/api/crypto/link-wallet').send(userData);

      // Mock insufficient balance
      (blockchainService.hasAdminSufficientBalance as jest.Mock).mockResolvedValueOnce(
        false
      );

      // Then try to reward tokens
      const response = await request(app).get(
        '/api/crypto/reward?token=0xabcdef1234567890abcdef1234567890abcdef12&amount=10&userId=user123'
      );

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Insufficient');
    });
  });
}); 