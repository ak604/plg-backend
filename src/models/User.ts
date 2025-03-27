// Simple in-memory storage for user-wallet associations
// In a real application, this would be replaced with a database

export interface User {
  userId: string;
  walletAddress: string;
}

class UserStore {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map<string, User>();
  }

  // Link a user ID with a wallet address
  linkWallet(userId: string, walletAddress: string): User {
    // Validate wallet address format (basic check)
    if (!this.isValidEthereumAddress(walletAddress)) {
      throw new Error('Invalid Ethereum wallet address');
    }

    const user: User = { userId, walletAddress };
    this.users.set(userId, user);
    return user;
  }

  // Get user by user ID
  getUserById(userId: string): User | undefined {
    return this.users.get(userId);
  }

  // Get user by wallet address
  getUserByWalletAddress(walletAddress: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.walletAddress.toLowerCase() === walletAddress.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  // Check if a user exists
  userExists(userId: string): boolean {
    return this.users.has(userId);
  }

  // Utility method to validate Ethereum addresses
  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Get all users (for testing purposes)
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  // Clear all users (for testing purposes)
  clearAllUsers(): void {
    this.users.clear();
  }
}

// Singleton instance
export const userStore = new UserStore();

export default userStore; 