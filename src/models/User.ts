import dynamoDbConfig from '../config/database';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

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
  private client: DynamoDBDocumentClient;

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

    const command = new PutCommand({
      TableName: this.tableName,
      Item: user,
      // ConditionExpression: 'attribute_not_exists(userId)' // Optional: prevent overwriting
    });

    try {
      await this.client.send(command);
      return user;
    } catch (error) {
      console.error('Error linking wallet in DynamoDB:', error);
      throw new Error(`Could not link wallet for user ${userId}: ${(error as Error).message}`);
    }
  }

  // Get user by user ID
  async getUserById(userId: string): Promise<User | undefined> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        userId,
      },
    });

    try {
      const result = await this.client.send(command);
      return result.Item as User | undefined;
    } catch (error) {
      console.error('Error getting user by ID from DynamoDB:', error);
      throw new Error(`Could not retrieve user ${userId}: ${(error as Error).message}`);
    }
  }

  // Get user by wallet address
  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    console.warn('getUserByWalletAddress performs a DynamoDB scan, which can be inefficient and costly. Consider adding a Global Secondary Index (GSI) on walletAddress.');
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'walletAddress = :walletAddress',
      ExpressionAttributeValues: {
        ':walletAddress': walletAddress,
      },
    });

    try {
      const result = await this.client.send(command);
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
    const command = new ScanCommand({ TableName: this.tableName });

    try {
      const result = await this.client.send(command);
      return (result.Items as User[]) || [];
    } catch (error) {
      console.error('Error getting all users from DynamoDB:', error);
      throw new Error(`Could not retrieve all users: ${(error as Error).message}`);
    }
  }

  // Clear all users (for testing purposes)
  async clearAllUsers(): Promise<void> {
    console.warn('clearAllUsers is intended for testing only and is very inefficient. It scans and deletes items one by one.');
    let users: User[];
    try {
       users = await this.getAllUsers();
    } catch(error) {
      console.error("Failed to get users for clearing:", error);
      return; // Exit if we can't get users
    }
   
    const deleteRequests = users.map(user => ({
      DeleteRequest: {
        Key: { userId: user.userId },
      },
    }));

    if (deleteRequests.length === 0) {
      console.log('No users found to clear.');
      return;
    }

    // BatchWriteCommand can handle up to 25 requests at a time
    for (let i = 0; i < deleteRequests.length; i += 25) {
      const batch = deleteRequests.slice(i, i + 25);
      const command = new BatchWriteCommand({
        RequestItems: {
          [this.tableName]: batch,
        },
      });
      try {
        const output = await this.client.send(command);
        // Handle potential unprocessed items from the output if necessary
        if (output.UnprocessedItems && output.UnprocessedItems[this.tableName] && output.UnprocessedItems[this.tableName].length > 0) {
           console.warn(`Warning: ${output.UnprocessedItems[this.tableName].length} items were not processed in batch delete.`);
           // Implement retry logic here if needed
        }
      } catch (error) {
        console.error('Error clearing users batch in DynamoDB:', error);
        // Decide if you want to stop or continue on batch error
        throw new Error(`Failed to clear users batch: ${(error as Error).message}`);
      }
    }
    console.log(`Attempted to clear ${deleteRequests.length} users.`);
  }
}

// Singleton instance
export const userStore = new UserStore();

export default userStore; 