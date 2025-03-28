import request from 'supertest';
import app from '../index'; // Import the Express app
import { userStore, User } from '../models/User'; // Import the actual userStore and User type
import { ethers } from 'ethers'; // Import ethers to potentially spy/mock if needed, though checking format might suffice

// Mock the userStore methods using jest.spyOn
// We spy on the actual instance exported from the module
let getUserByIdSpy: jest.SpyInstance;
let linkWalletSpy: jest.SpyInstance;

// Define a regex to validate Ethereum addresses
const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;

describe('App API Endpoints - GET /api/app/load', () => {
    beforeEach(() => {
        // Reset mocks and spies before each test
        jest.clearAllMocks();

        // Spy on the methods of the actual userStore instance
        getUserByIdSpy = jest.spyOn(userStore, 'getUserById');
        linkWalletSpy = jest.spyOn(userStore, 'linkWallet');
    });

    afterEach(() => {
        // Restore original implementations after each test
        getUserByIdSpy.mockRestore();
        linkWalletSpy.mockRestore();
    });

    it('should generate a wallet for a user without one and return 200', async () => {
        const mockUserId = 'userWithoutWallet';
        const mockUser: User = { userId: mockUserId, walletAddress: '' }; // User exists, but no walletAddress
        const generatedAddress = ethers.Wallet.createRandom().address; // Example address format

        // Mock implementations
        getUserByIdSpy.mockResolvedValue(mockUser);
        // Mock linkWallet to return the user with the new address and timestamps
        linkWalletSpy.mockImplementation(async (userId, walletAddress) => ({
            userId,
            walletAddress,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));

        const response = await request(app).get(`/api/app/load?userId=${mockUserId}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('Successfully generated and saved');
        expect(response.body.userId).toBe(mockUserId);
        expect(response.body.walletAddress).toMatch(ethAddressRegex); // Check format
        expect(getUserByIdSpy).toHaveBeenCalledWith(mockUserId);
        // Check that linkWallet was called with the userId and a valid address
        expect(linkWalletSpy).toHaveBeenCalledWith(mockUserId, expect.stringMatching(ethAddressRegex));
    });

    it('should return 200 and indicate no update needed if user already has a wallet', async () => {
        const mockUserId = 'userWithWallet';
        const existingAddress = '0x1234567890abcdef1234567890abcdef12345678';
        const mockUser: User = { userId: mockUserId, walletAddress: existingAddress };

        getUserByIdSpy.mockResolvedValue(mockUser);

        const response = await request(app).get(`/api/app/load?userId=${mockUserId}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('already has a wallet address');
        expect(response.body.userId).toBe(mockUserId);
        expect(response.body.walletAddress).toBe(existingAddress);
        expect(getUserByIdSpy).toHaveBeenCalledWith(mockUserId);
        expect(linkWalletSpy).not.toHaveBeenCalled(); // Ensure linkWallet wasn't called
    });

    it('should return 400 if userId query parameter is missing', async () => {
        const response = await request(app).get('/api/app/load'); // No userId

        expect(response.status).toBe(400);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Missing required query parameter: userId');
        expect(getUserByIdSpy).not.toHaveBeenCalled();
        expect(linkWalletSpy).not.toHaveBeenCalled();
    });

    it('should return 404 if user is not found', async () => {
        const mockUserId = 'nonExistentUser';
        getUserByIdSpy.mockResolvedValue(undefined); // User not found

        const response = await request(app).get(`/api/app/load?userId=${mockUserId}`);

        expect(response.status).toBe(404);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain(`User with ID ${mockUserId} not found`);
        expect(getUserByIdSpy).toHaveBeenCalledWith(mockUserId);
        expect(linkWalletSpy).not.toHaveBeenCalled();
    });

    it('should return 500 if getUserById fails', async () => {
        const mockUserId = 'getUserError';
        const errorMessage = 'DynamoDB read error';
        getUserByIdSpy.mockRejectedValue(new Error(errorMessage)); // Simulate DB error

        const response = await request(app).get(`/api/app/load?userId=${mockUserId}`);

        expect(response.status).toBe(500);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain(`Failed to process request for user ${mockUserId}`);
        expect(response.body.details).toBe(errorMessage);
        expect(getUserByIdSpy).toHaveBeenCalledWith(mockUserId);
        expect(linkWalletSpy).not.toHaveBeenCalled();
    });

    it('should return 500 if linkWallet fails', async () => {
        const mockUserId = 'linkWalletError';
        const mockUser: User = { userId: mockUserId, walletAddress: '' };
        const errorMessage = 'DynamoDB write error';

        getUserByIdSpy.mockResolvedValue(mockUser);
        linkWalletSpy.mockRejectedValue(new Error(errorMessage)); // Simulate DB error on write

        const response = await request(app).get(`/api/app/load?userId=${mockUserId}`);

        expect(response.status).toBe(500);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain(`Failed to process request for user ${mockUserId}`);
        expect(response.body.details).toBe(errorMessage);
        expect(getUserByIdSpy).toHaveBeenCalledWith(mockUserId);
        // Check linkWallet was called before it threw the error
        expect(linkWalletSpy).toHaveBeenCalledWith(mockUserId, expect.stringMatching(ethAddressRegex));
    });
}); 