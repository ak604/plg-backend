import request from 'supertest';
import app from '../index'; // Import the Express app
import { userStore, User } from '../models/User'; // Import the actual userStore and User type

// Mock the userStore method using jest.spyOn
let updateCurrencyBalanceSpy: jest.SpyInstance;

describe('Admin API Endpoints - POST /api/admin/reward-currency', () => {
    beforeEach(() => {
        // Reset mocks and spies before each test
        jest.clearAllMocks();

        // Spy on the updateCurrencyBalance method
        updateCurrencyBalanceSpy = jest.spyOn(userStore, 'updateCurrencyBalance');
    });

    afterEach(() => {
        // Restore original implementations after each test
        updateCurrencyBalanceSpy.mockRestore();
    });

    it('should successfully reward currency to a user and return 200', async () => {
        const mockUserId = 'userToReward';
        const mockCurrency = 'POINTS';
        const mockAmount = 100;
        const mockUpdatedUser: User = { // Simulate the user object returned after update
            userId: mockUserId,
            walletAddress: '0xabc...', // Assuming user might have a wallet
            currencyMap: { [mockCurrency]: 150 }, // Example pre-existing + new amount
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Mock the store method to resolve successfully
        updateCurrencyBalanceSpy.mockResolvedValue(mockUpdatedUser);

        const response = await request(app)
            .post('/api/admin/reward-currency')
            .send({ userId: mockUserId, currency: mockCurrency, amount: mockAmount });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain(`Successfully rewarded ${mockAmount} ${mockCurrency.toUpperCase()}`);
        expect(response.body.data).toEqual(mockUpdatedUser); // Check if the updated user is returned
        expect(updateCurrencyBalanceSpy).toHaveBeenCalledWith(mockUserId, mockCurrency.toUpperCase(), mockAmount);
    });

    it('should return 400 if userId is missing', async () => {
        const response = await request(app)
            .post('/api/admin/reward-currency')
            .send({ currency: 'POINTS', amount: 100 });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Missing required fields');
        expect(updateCurrencyBalanceSpy).not.toHaveBeenCalled();
    });

    it('should return 400 if currency is missing', async () => {
         const response = await request(app)
            .post('/api/admin/reward-currency')
            .send({ userId: 'user123', amount: 100 });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Missing required fields');
        expect(updateCurrencyBalanceSpy).not.toHaveBeenCalled();
    });

     it('should return 400 if currency is an empty string', async () => {
         const response = await request(app)
            .post('/api/admin/reward-currency')
            .send({ userId: 'user123', currency: '  ', amount: 100 });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid currency symbol');
        expect(updateCurrencyBalanceSpy).not.toHaveBeenCalled();
    });

    it('should return 400 if amount is missing', async () => {
        const response = await request(app)
            .post('/api/admin/reward-currency')
            .send({ userId: 'user123', currency: 'POINTS' });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Missing required fields');
        expect(updateCurrencyBalanceSpy).not.toHaveBeenCalled();
    });

    it('should return 400 if amount is not a number', async () => {
        const response = await request(app)
            .post('/api/admin/reward-currency')
            .send({ userId: 'user123', currency: 'POINTS', amount: 'abc' });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Amount must be a positive number');
        expect(updateCurrencyBalanceSpy).not.toHaveBeenCalled();
    });

     it('should return 400 if amount is zero', async () => {
        const response = await request(app)
            .post('/api/admin/reward-currency')
            .send({ userId: 'user123', currency: 'POINTS', amount: 0 });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Amount must be a positive number');
        expect(updateCurrencyBalanceSpy).not.toHaveBeenCalled();
    });

    it('should return 400 if amount is negative', async () => {
        const response = await request(app)
            .post('/api/admin/reward-currency')
            .send({ userId: 'user123', currency: 'POINTS', amount: -50 });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Amount must be a positive number');
        expect(updateCurrencyBalanceSpy).not.toHaveBeenCalled();
    });

    it('should return 404 if user is not found', async () => {
        const mockUserId = 'nonExistentUser';
        const mockCurrency = 'POINTS';
        const mockAmount = 50;
        const errorMessage = `User with ID ${mockUserId} not found.`;

        // Mock the store method to throw the specific "not found" error
        updateCurrencyBalanceSpy.mockRejectedValue(new Error(errorMessage));

        const response = await request(app)
            .post('/api/admin/reward-currency')
            .send({ userId: mockUserId, currency: mockCurrency, amount: mockAmount });

        expect(response.status).toBe(404);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe(errorMessage);
        expect(updateCurrencyBalanceSpy).toHaveBeenCalledWith(mockUserId, mockCurrency.toUpperCase(), mockAmount);
    });

     it('should return 500 if the user store update fails for other reasons', async () => {
        const mockUserId = 'dbErrorUser';
        const mockCurrency = 'POINTS';
        const mockAmount = 50;
        const errorMessage = 'Internal DynamoDB error';

        // Mock the store method to throw a generic error
        updateCurrencyBalanceSpy.mockRejectedValue(new Error(errorMessage));

        const response = await request(app)
            .post('/api/admin/reward-currency')
            .send({ userId: mockUserId, currency: mockCurrency, amount: mockAmount });

        expect(response.status).toBe(500);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain(`Failed to reward currency for user ${mockUserId}`);
        expect(response.body.details).toBe(errorMessage);
        expect(updateCurrencyBalanceSpy).toHaveBeenCalledWith(mockUserId, mockCurrency.toUpperCase(), mockAmount);
    });
}); 