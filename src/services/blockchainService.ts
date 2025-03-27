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
      const balance = await tokenContract.balanceOf(this.adminWallet.address);
      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.utils.parseUnits(amount, decimals);
      
      return balance.gte(amountInWei);
    } catch (error) {
      console.error('Failed to check admin balance:', error);
      throw new Error('Failed to check admin balance');
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
      
      // Get token decimals
      const decimals = await tokenContract.decimals();
      
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
      
      // Send the transaction
      const transaction = await tokenContract.transfer(userWalletAddress, amountInWei);
      
      // Wait for the transaction to be mined
      const receipt = await transaction.wait();
      
      return receipt;
    } catch (error) {
      console.error('Failed to transfer tokens:', error);
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
      
      const [name, symbol, decimals] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
      ]);
      
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