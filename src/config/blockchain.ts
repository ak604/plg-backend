import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const blockchainConfig = {
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || '',
  rpcUrl: process.env.RPC_URL || 'https://mainnet.infura.io/v3/your_infura_key',
  chainId: parseInt(process.env.CHAIN_ID || '1', 10),
};

if (!blockchainConfig.adminPrivateKey) {
  console.warn('Warning: Admin private key is not set in environment variables');
}

if (blockchainConfig.rpcUrl.includes('your_infura_key')) {
  console.warn('Warning: RPC URL is not properly configured');
}

export default blockchainConfig; 