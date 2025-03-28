import { ethers } from 'ethers';
import blockchainConfig from '../config/blockchain';

// ABI for ERC20 token interaction
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private adminWallet: ethers.Wallet;

  constructor() {
    try {
      this.provider = new ethers.providers.JsonRpcProvider(blockchainConfig.rpcUrl);
      this.adminWallet = new ethers.Wallet(blockchainConfig.adminPrivateKey, this.provider);
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw new Error('Blockchain service initialization failed');
    }
  }

  /**
   * Get the token contract instance
   * @param tokenAddress - The address of the ERC20 token
   * @returns The token contract instance
   */
  private getTokenContract(tokenAddress: string): ethers.Contract {
    try {
      return new ethers.Contract(tokenAddress, ERC20_ABI, this.adminWallet);
    } catch (error) {
      console.error('Failed to get token contract:', error);
      throw new Error('Invalid token address');
    }
  }

  /**
   * Get the admin wallet address
   * @returns The admin wallet address
   */
  getAdminAddress(): string {
    return this.adminWallet.address;
  }

  /**
   * Check if the admin wallet has sufficient token balance
   * @param tokenAddress - The address of the ERC20 token
   * @param amount - The amount to check
   * @returns True if the admin has sufficient balance, false otherwise
   */
  async hasAdminSufficientBalance(tokenAddress: string, amount: string): Promise<boolean> {
    try {
      const tokenContract = this.getTokenContract(tokenAddress);
      
      // Check if the contract has proper code at the address
      const code = await this.provider.getCode(tokenAddress);
      if (code === '0x') {
        throw new Error(`No contract deployed at address ${tokenAddress}`);
      }
      
      // Get balance, defaulting to 0 if balanceOf method fails
      let balance;
      try {
        balance = await tokenContract.balanceOf(this.adminWallet.address);
      } catch (error) {
        console.error(`Token at ${tokenAddress} does not implement balanceOf() function correctly`);
        throw new Error('Token does not implement ERC20 standard properly');
      }
      
      // Get decimals with fallback to 18
      let decimals = 18;
      try {
        decimals = await tokenContract.decimals();
      } catch (error) {
        console.warn(`Token at ${tokenAddress} does not implement decimals() function, using default: 18`);
      }
      
      const amountInWei = ethers.utils.parseUnits(amount, decimals);
      
      return balance.gte(amountInWei);
    } catch (error: any) {
      console.error('Failed to check admin balance:', error);
      if (error.code === 'CALL_EXCEPTION') {
        throw new Error(`Failed to check balance: Contract at ${tokenAddress} doesn't support the ERC20 standard properly`);
      }
      throw new Error(`Failed to check admin balance: ${(error as Error).message}`);
    }
  }

  /**
   * Transfer tokens from admin wallet to user wallet
   * @param tokenAddress - The address of the ERC20 token
   * @param userWalletAddress - The recipient's wallet address
   * @param amount - The amount of tokens to transfer (in human-readable format)
   * @returns The transaction receipt
   */
  async transferTokens(
    tokenAddress: string,
    userWalletAddress: string,
    amount: string
  ): Promise<ethers.providers.TransactionReceipt> {
    try {
      // Get token contract
      const tokenContract = this.getTokenContract(tokenAddress);
      
      // Get token decimals (with fallback to 18 if not implemented)
      let decimals = 18;
      try {
        decimals = await tokenContract.decimals();
      } catch (error) {
        console.warn(`Token at ${tokenAddress} does not implement decimals() function, using default: 18`);
      }
      
      // Convert amount to token units with proper decimals
      const amountInWei = ethers.utils.parseUnits(amount, decimals);
      
      // Check if admin has sufficient balance
      const hasSufficientBalance = await this.hasAdminSufficientBalance(
        tokenAddress,
        amount
      );
      
      if (!hasSufficientBalance) {
        throw new Error('Insufficient token balance in admin wallet');
      }

      // Attempt to verify if the token implements ERC20 transfer properly
      try {
        // Check token code
        const code = await this.provider.getCode(tokenAddress);
        if (code === '0x') {
          throw new Error(`No contract deployed at address ${tokenAddress}`);
        }
      } catch (error) {
        console.error('Error checking token contract:', error);
        throw new Error(`Invalid token contract at ${tokenAddress}`);
      }
      
      // Send the transaction
      const transaction = await tokenContract.transfer(userWalletAddress, amountInWei);
      
      // Wait for the transaction to be mined
      const receipt = await transaction.wait();
      
      return receipt;
    } catch (error: any) {
      console.error('Failed to transfer tokens:', error);
      // Provide more descriptive error messages based on error type
      if (error.code === 'CALL_EXCEPTION') {
        throw new Error(`Token transfer failed: Contract at ${tokenAddress} doesn't support the ERC20 standard properly`);
      }
      throw new Error(`Token transfer failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get token information
   * @param tokenAddress - The address of the ERC20 token
   * @returns The token information
   */
  async getTokenInfo(tokenAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
  }> {
    try {
      const tokenContract = this.getTokenContract(tokenAddress);
      
      // Use try-catch for each method call in case the token doesn't implement some methods
      let name = 'Unknown Token';
      let symbol = 'UNKNOWN';
      let decimals = 18; // Default to 18 decimals
      
      try {
        name = await tokenContract.name();
      } catch (error) {
        console.warn(`Token at ${tokenAddress} does not implement name() function`);
      }
      
      try {
        symbol = await tokenContract.symbol();
      } catch (error) {
        console.warn(`Token at ${tokenAddress} does not implement symbol() function`);
      }
      
      try {
        decimals = await tokenContract.decimals();
      } catch (error) {
        console.warn(`Token at ${tokenAddress} does not implement decimals() function, using default: 18`);
      }
      
      return { name, symbol, decimals };
    } catch (error) {
      console.error('Failed to get token info:', error);
      throw new Error('Failed to get token information');
    }
  }

  /**
   * Validate an Ethereum address
   * @param address - The address to validate
   * @returns True if the address is valid, false otherwise
   */
  isValidAddress(address: string): boolean {
    return ethers.utils.isAddress(address);
  }
}

export const blockchainService = new BlockchainService();

export default blockchainService; 