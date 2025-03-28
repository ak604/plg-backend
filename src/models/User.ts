import dynamoDbConfig from '../config/database';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

// Simple in-memory storage for user-wallet associations
// In a real application, this would be replaced with a database

export interface User {
  userId: string; // Partition Key
  walletAddress: string;
  createdAt?: string;
  updatedAt?: string;
}

class UserStore {
  private tableName: string;
  private client: DocumentClient;

  constructor() {
    this.tableName = dynamoDbConfig.tableName;
    this.client = dynamoDbConfig.client;
  }

  // Link a user ID with a wallet address
  async linkWallet(userId: string, walletAddress: string): Promise<User> {
    if (!this.isValidEthereumAddress(walletAddress)) {
      throw new Error('Invalid Ethereum wallet address');
    }

    const timestamp = new Date().toISOString();
    const user: User = {
      userId,
      walletAddress,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const params: DocumentClient.PutItemInput = {
      TableName: this.tableName,
      Item: user,
      // ConditionExpression: 'attribute_not_exists(userId)' // Optional: prevent overwriting existing users
    };

    try {
      await this.client.put(params).promise();
      return user;
    } catch (error) {
      console.error('Error linking wallet in DynamoDB:', error);
      throw new Error(`Could not link wallet for user ${userId}: ${(error as Error).message}`);
    }
  }

  // Get user by user ID
  async getUserById(userId: string): Promise<User | undefined> {
    const params: DocumentClient.GetItemInput = {
      TableName: this.tableName,
      Key: {
        userId,
      },
    };

    try {
      const result = await this.client.get(params).promise();
      return result.Item as User | undefined;
    } catch (error) {
      console.error('Error getting user by ID from DynamoDB:', error);
      throw new Error(`Could not retrieve user ${userId}: ${(error as Error).message}`);
    }
  }

  // Get user by wallet address
  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    console.warn('getUserByWalletAddress performs a DynamoDB scan, which can be inefficient and costly. Consider adding a Global Secondary Index (GSI) on walletAddress.');
    const params: DocumentClient.ScanInput = {
      TableName: this.tableName,
      FilterExpression: 'walletAddress = :walletAddress',
      ExpressionAttributeValues: {
        ':walletAddress': walletAddress,
      },
    };

    try {
      const result = await this.client.scan(params).promise();
      if (result.Items && result.Items.length > 0) {
        return result.Items[0] as User;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting user by wallet address from DynamoDB:', error);
      throw new Error(`Could not retrieve user by wallet ${walletAddress}: ${(error as Error).message}`);
    }
  }

  // Check if a user exists
  async userExists(userId: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    return !!user;
  }

  // Utility method to validate Ethereum addresses
  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Get all users (for testing purposes)
  async getAllUsers(): Promise<User[]> {
    console.warn('getAllUsers performs a DynamoDB scan, which can be very inefficient and costly for large tables.');
    const params: DocumentClient.ScanInput = {
      TableName: this.tableName,
    };

    try {
      const result = await this.client.scan(params).promise();
      return (result.Items as User[]) || [];
    } catch (error) {
      console.error('Error getting all users from DynamoDB:', error);
      throw new Error(`Could not retrieve all users: ${(error as Error).message}`);
    }
  }

  // Clear all users (for testing purposes)
  async clearAllUsers(): Promise<void> {
    console.warn('clearAllUsers is intended for testing only and is very inefficient. It scans and deletes items one by one.');
    const users = await this.getAllUsers();
    const deleteRequests = users.map(user => ({
      DeleteRequest: {
        Key: { userId: user.userId },
      },
    }));

    if (deleteRequests.length === 0) {
      return;
    }

    // BatchWriteItem can handle up to 25 requests at a time
    for (let i = 0; i < deleteRequests.length; i += 25) {
      const batch = deleteRequests.slice(i, i + 25);
      const params: DocumentClient.BatchWriteItemInput = {
        RequestItems: {
          [this.tableName]: batch,
        },
      };
      try {
        await this.client.batchWrite(params).promise();
      } catch (error) {
        console.error('Error clearing users in DynamoDB:', error);
        // Handle potential unprocessed items if needed
        throw new Error(`Failed to clear all users: ${(error as Error).message}`);
      }
    }
    console.log(`Cleared ${deleteRequests.length} users.`);
  }
}

// Singleton instance
export const userStore = new UserStore();

export default userStore; 