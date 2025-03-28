import request from 'supertest';
import app from '../index';
// Import the actual userStore and its type
import { userStore, User } from '../models/User';
import blockchainService from '../services/blockchainService';

// --- Mock Blockchain Service --- 
jest.mock('../services/blockchainService', () => ({
  isValidAddress: jest.fn().mockImplementation((address: string) => {
    // Basic validation for tests
    return /^0x[a-fA-F0-9]{40}$/.test(address);
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
  getAdminAddress: jest.fn().mockReturnValue('0xAdminWalletAddress'),
}));

// --- Mocks for User Store Methods ---
// Define mock functions separately
const mockLinkWallet = jest.fn();
const mockGetUserById = jest.fn();
const mockClearAllUsers = jest.fn().mockResolvedValue(undefined);


describe('Crypto API Endpoints', () => {

  // Store original implementations
  let originalLinkWallet: any;
  let originalGetUserById: any;
  let originalClearAllUsers: any;

  beforeAll(() => {
    // Store original methods before any tests run
    originalLinkWallet = userStore.linkWallet;
    originalGetUserById = userStore.getUserById;
    originalClearAllUsers = userStore.clearAllUsers;
  });

  beforeEach(() => { 
    jest.clearAllMocks(); // Clear call history etc. for ALL mocks

    // Apply mocks using spyOn and mockImplementation
    jest.spyOn(userStore, 'linkWallet').mockImplementation(mockLinkWallet);
    jest.spyOn(userStore, 'getUserById').mockImplementation(mockGetUserById);
    jest.spyOn(userStore, 'clearAllUsers').mockImplementation(mockClearAllUsers);

    // Reset mock implementations to clear state between tests
    mockLinkWallet.mockReset();
    mockGetUserById.mockReset();
    mockClearAllUsers.mockReset(); 

    // Reset blockchainService mocks if needed (optional, jest.clearAllMocks might suffice)
    (blockchainService.hasAdminSufficientBalance as jest.Mock).mockClear();
    (blockchainService.transferTokens as jest.Mock).mockClear();
    // ... etc for other blockchainService mocks ...
  });

  afterAll(() => {
    // Restore original implementations after all tests are done
    userStore.linkWallet = originalLinkWallet;
    userStore.getUserById = originalGetUserById;
    userStore.clearAllUsers = originalClearAllUsers;
  });

  // --- Test Suites --- 

  describe('POST /api/crypto/link-wallet', () => {
    it('should link a wallet address to a user ID and return the user', async () => {
      const userData: User = {
        userId: 'user123',
        walletAddress: '0x1234567890123456789012345678901234567890',
      };
      // Set the mock implementation for *this specific test*
      mockLinkWallet.mockResolvedValue(userData); 

      const response = await request(app)
        .post('/api/crypto/link-wallet')
        .send(userData); 

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(expect.objectContaining(userData)); 
      // Check if the *mock function* was called
      expect(mockLinkWallet).toHaveBeenCalledWith(
        userData.userId,
        userData.walletAddress
      );
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
      expect(mockLinkWallet).not.toHaveBeenCalled();
    });

    it('should return 400 if walletAddress is missing', async () => {
      const response = await request(app).post('/api/crypto/link-wallet').send({
        userId: 'user123',
      });
      expect(response.status).toBe(400);
      expect(mockLinkWallet).not.toHaveBeenCalled();
    });

    it('should return 400 if walletAddress is invalid', async () => {
      const response = await request(app).post('/api/crypto/link-wallet').send({
        userId: 'user123',
        walletAddress: 'invalid-address',
      });
      expect(response.status).toBe(400);
      expect(mockLinkWallet).not.toHaveBeenCalled();
    });
    
    it('should return 500 if linking wallet fails in store', async () => {
      const userData = {
        userId: 'user123',
        walletAddress: '0x1234567890123456789012345678901234567890',
      };
      mockLinkWallet.mockRejectedValue(new Error('DynamoDB write failed'));

      const response = await request(app)
        .post('/api/crypto/link-wallet')
        .send(userData);

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('DynamoDB write failed');
    });
  });

  describe('GET /api/crypto/user/:userId', () => {
    it('should return wallet information for a user', async () => {
      const userId = 'user123';
      const storedUser: User = {
        userId,
        walletAddress: '0x1234567890123456789012345678901234567890',
        createdAt: new Date().toISOString()
      };
      mockGetUserById.mockResolvedValue(storedUser);

      const response = await request(app).get(
        `/api/crypto/user/${userId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(storedUser);
      expect(mockGetUserById).toHaveBeenCalledWith(userId);
    });

    it('should return 404 if user is not found', async () => {
      const userId = 'nonexistent';
      mockGetUserById.mockResolvedValue(undefined); 

      const response = await request(app).get(`/api/crypto/user/${userId}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(mockGetUserById).toHaveBeenCalledWith(userId);
    });
    
    it('should return 500 if fetching user fails in store', async () => {
      const userId = 'user123';
      mockGetUserById.mockRejectedValue(new Error('DynamoDB read failed'));

      const response = await request(app).get(
        `/api/crypto/user/${userId}`
      );

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('DynamoDB read failed');
    });
  });

  describe('GET /api/crypto/reward', () => {
    const tokenAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
    const amount = '10.5';
    const userId = 'user123';
    const userWalletAddress = '0xUserWalletAddress12345678901234567890';
    const storedUser: User = { userId, walletAddress: userWalletAddress };
    
    beforeEach(() => {
      // Set default mock implementations for this suite
      mockGetUserById.mockResolvedValue(storedUser);
      (blockchainService.hasAdminSufficientBalance as jest.Mock).mockResolvedValue(true);
      (blockchainService.transferTokens as jest.Mock).mockResolvedValue({
        transactionHash: '0x1234567890abcdef', blockNumber: 12345 
      });
    });
    
    it('should reward tokens to a user', async () => {
      const response = await request(app).get(
        `/api/crypto/reward?token=${tokenAddress}&amount=${amount}&userId=${userId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      // Check calls to mocks
      expect(mockGetUserById).toHaveBeenCalledWith(userId);
      expect(blockchainService.hasAdminSufficientBalance).toHaveBeenCalledWith(tokenAddress, amount);
      expect(blockchainService.transferTokens).toHaveBeenCalledWith(
        tokenAddress,
        userWalletAddress,
        amount
      );
    });

    it('should return 400 if token is missing', async () => {
      const response = await request(app).get(
        `/api/crypto/reward?amount=${amount}&userId=${userId}`
      );
      expect(response.status).toBe(400);
      expect(mockGetUserById).not.toHaveBeenCalled();
      expect(blockchainService.transferTokens).not.toHaveBeenCalled();
    });

    it('should return 400 if amount is missing', async () => {
      const response = await request(app).get(
        `/api/crypto/reward?token=${tokenAddress}&userId=${userId}`
      );
      expect(response.status).toBe(400);
      expect(mockGetUserById).not.toHaveBeenCalled();
      expect(blockchainService.transferTokens).not.toHaveBeenCalled();
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app).get(
        `/api/crypto/reward?token=${tokenAddress}&amount=${amount}`
      );
      expect(response.status).toBe(400);
      expect(mockGetUserById).not.toHaveBeenCalled();
      expect(blockchainService.transferTokens).not.toHaveBeenCalled();
    });

    it('should return 400 if token address is invalid', async () => {
      const response = await request(app).get(
        `/api/crypto/reward?token=invalid-token&amount=${amount}&userId=${userId}`
      );
      expect(response.status).toBe(400);
      expect(mockGetUserById).not.toHaveBeenCalled();
      expect(blockchainService.transferTokens).not.toHaveBeenCalled();
    });

    it('should return 400 if amount is not a positive number', async () => {
      const response = await request(app).get(
        `/api/crypto/reward?token=${tokenAddress}&amount=-10&userId=${userId}`
      );
      expect(response.status).toBe(400);
      expect(mockGetUserById).not.toHaveBeenCalled();
      expect(blockchainService.transferTokens).not.toHaveBeenCalled();
    });

    it('should return 404 if user is not found in store', async () => {
      mockGetUserById.mockResolvedValue(undefined); 
      const response = await request(app).get(
        `/api/crypto/reward?token=${tokenAddress}&amount=${amount}&userId=nonexistentUser`
      );
      expect(response.status).toBe(404);
      expect(mockGetUserById).toHaveBeenCalledWith('nonexistentUser');
      expect(blockchainService.transferTokens).not.toHaveBeenCalled();
    });

    it('should return 400 if admin has insufficient balance', async () => {
      (blockchainService.hasAdminSufficientBalance as jest.Mock).mockResolvedValueOnce(false);
      const response = await request(app).get(
        `/api/crypto/reward?token=${tokenAddress}&amount=${amount}&userId=${userId}`
      );
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Insufficient');
      expect(mockGetUserById).toHaveBeenCalledWith(userId);
      expect(blockchainService.transferTokens).not.toHaveBeenCalled();
    });

    it('should return 400 if token contract check fails (e.g., non-compliant)', async () => {
       (blockchainService.hasAdminSufficientBalance as jest.Mock).mockRejectedValueOnce(
        new Error("doesn't support the ERC20 standard properly")
      );
      const response = await request(app).get(
        `/api/crypto/reward?token=${tokenAddress}&amount=${amount}&userId=${userId}`
      );
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('ERC20 standard');
      expect(mockGetUserById).toHaveBeenCalledWith(userId);
      expect(blockchainService.transferTokens).not.toHaveBeenCalled();
    });

    it('should return 500 if transferTokens fails', async () => {
      (blockchainService.transferTokens as jest.Mock).mockRejectedValueOnce(new Error('Blockchain RPC error'));
      const response = await request(app).get(
        `/api/crypto/reward?token=${tokenAddress}&amount=${amount}&userId=${userId}`
      );
      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Blockchain RPC error');
    });
  });
}); 