import dynamoDbConfig from '../config/database';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, BatchWriteCommand, ScanCommandOutput, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Simple in-memory storage for user-wallet associations
// In a real application, this would be replaced with a database

export interface User {
  userId: string; // Partition Key
  walletAddress: string;
  currencyMap?: { [currency: string]: number }; // Add the currency map field (optional for existing records)
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

  // Get ALL users (handles pagination)
  async getAllUsers(): Promise<User[]> {
    console.warn('getAllUsers performs a DynamoDB scan, which can be very inefficient and costly for large tables.');
    const allUsers: User[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;

    try {
      do {
        const command = new ScanCommand({
          TableName: this.tableName,
          ExclusiveStartKey: lastEvaluatedKey,
        });

        const result: ScanCommandOutput = await this.client.send(command);

        if (result.Items) {
          allUsers.push(...(result.Items as User[]));
        }

        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      return allUsers;
    } catch (error) {
      console.error('Error getting all users from DynamoDB with pagination:', error);
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

  // Atomically update the balance for a specific currency in the user's currencyMap
  async updateCurrencyBalance(userId: string, currency: string, amountToAdd: number): Promise<User> {
    // Input validation (amount > 0, currency not empty)
    if (amountToAdd <= 0) { throw new Error('Amount to add must be positive.'); }
    if (!currency || currency.trim() === '') { throw new Error('Currency symbol cannot be empty.'); }

    const timestamp = new Date().toISOString();

    // Define the main update command (assumes map exists initially)
    const mainUpdateCommandInput = {
      TableName: this.tableName,
      Key: { userId },
      UpdateExpression: 'ADD currencyMap.#currency :amount SET updatedAt = :timestamp',
      ExpressionAttributeNames: { '#currency': currency },
      ExpressionAttributeValues: { ':amount': amountToAdd, ':timestamp': timestamp },
      ReturnValues: 'ALL_NEW' as const, // Use 'as const' for stricter typing if needed
      // Condition: Check user exists AND the map exists for the first attempt
      ConditionExpression: 'attribute_exists(userId) AND attribute_exists(currencyMap)',
    };
    const mainUpdateCommand = new UpdateCommand(mainUpdateCommandInput);

    try {
      // --- First Attempt ---
      console.log(`Attempting to reward ${amountToAdd} ${currency} to user ${userId} (assuming currencyMap exists)`);
      const result = await this.client.send(mainUpdateCommand);
      if (!result.Attributes) { throw new Error('Update attempt 1 succeeded but returned no attributes.'); }
      console.log(`Reward successful on first attempt for user ${userId}`);
      return result.Attributes as User;

    } catch (error: any) {
      // --- Handle Conditional Check Failure ---
      if (error.name === 'ConditionalCheckFailedException') {
        console.log(`Conditional check failed for user ${userId}. Checking if currencyMap was missing...`);
        // Condition failed. Check if the user actually exists.
        const userCheck = await this.getUserById(userId);
        if (!userCheck) {
            // If user doesn't exist, throw the appropriate error
             console.error(`User ${userId} not found during conditional check.`);
             throw new Error(`User with ID ${userId} not found.`);
        }

        // If user exists, the currencyMap must be missing. Try to initialize it.
        console.warn(`User ${userId} found but currencyMap is missing. Initializing map...`);
        const initMapCommand = new UpdateCommand({
          TableName: this.tableName,
          Key: { userId },
          UpdateExpression: 'SET currencyMap = if_not_exists(currencyMap, :emptyMap), updatedAt = :timestamp',
          ExpressionAttributeValues: { ':emptyMap': {}, ':timestamp': timestamp },
          ConditionExpression: 'attribute_exists(userId)', // Only need user to exist here
        });

        try {
          await this.client.send(initMapCommand);
          console.log(`currencyMap initialized for user ${userId}. Retrying reward...`);

          // --- Retry the main update ---
          // Now we only need to condition on the user existing.
          const retryUpdateCommandInput = {
             ...mainUpdateCommandInput, // Reuse most input from the first attempt
             ConditionExpression: 'attribute_exists(userId)', // Only check user exists now
          };
          const retryUpdateCommand = new UpdateCommand(retryUpdateCommandInput);

          const retryResult = await this.client.send(retryUpdateCommand);
          if (!retryResult.Attributes) { throw new Error('Retry update succeeded but returned no attributes.'); }
           console.log(`Reward successful on retry attempt for user ${userId}`);
          return retryResult.Attributes as User;

        } catch (retryError: any) {
           // Handle errors during initialization or retry
           console.error(`Error during currencyMap initialization or reward retry for ${userId}:`, retryError);
           // Check if the retry failed because the user *still* doesn't exist (shouldn't happen normally)
           if (retryError.name === 'ConditionalCheckFailedException') {
               throw new Error(`User with ID ${userId} could not be updated (potentially deleted during operation).`);
           }
           throw new Error(`Failed to update balance for ${currency} for user ${userId} after attempting map initialization: ${retryError.message}`);
        }
      } else {
        // --- Handle Other Errors ---
        // It wasn't a conditional check failure, so rethrow the original error.
        console.error(`Non-conditional error updating currency balance for user ${userId}:`, error);
        throw new Error(`Could not update balance for ${currency} for user ${userId}: ${error.message}`);
      }
    }
  }
}

// Singleton instance
export const userStore = new UserStore();

export default userStore; 