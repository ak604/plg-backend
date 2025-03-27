# Crypto Rewards API

This Express.js application provides endpoints for rewarding users with crypto tokens on EVM-compatible blockchains.

## Features

- Link user IDs with Ethereum wallet addresses
- Reward users with ERC20 tokens
- Transfer tokens from admin wallet to user wallets
- Get user wallet information
- Interactive API documentation with Swagger

## Tech Stack

- Node.js
- Express.js
- TypeScript
- Ethers.js (for blockchain interaction)
- Jest (for testing)
- Swagger (for API documentation)

## Prerequisites

- Node.js >= 14.x
- npm >= 6.x
- An Ethereum private key for the admin wallet
- Access to an Ethereum RPC URL (e.g., Infura, Alchemy)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd crypto-rewards-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   NODE_ENV=development
   ADMIN_PRIVATE_KEY=your_admin_private_key_here
   RPC_URL=https://mainnet.infura.io/v3/your_infura_key
   CHAIN_ID=1
   ```

## Usage

### Development

```bash
npm run dev
```

The server will start at http://localhost:3000 and the Swagger documentation will be available at http://localhost:3000/api-docs.

### Production

```bash
npm run build
npm start
```

### Testing

```bash
npm test
```

## API Documentation

Interactive API documentation is available via Swagger UI at `/api-docs` when the server is running. You can test all the endpoints directly from the browser.

Alternatively, you can access the Swagger JSON definition at `/swagger.json`.

## API Endpoints

### Link User with Wallet

```
POST /api/crypto/link-wallet
```

**Request Body:**
```json
{
  "userId": "user123",
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Wallet successfully linked to user",
  "data": {
    "userId": "user123",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }
}
```

### Get User Wallet Information

```
GET /api/crypto/user/:userId
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "userId": "user123",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }
}
```

### Reward User with Tokens

```
GET /api/crypto/reward?token=0xabcdef1234567890abcdef1234567890abcdef12&amount=10.5&userId=user123
```

**Query Parameters:**
- `token`: The ERC20 token address
- `amount`: The amount of tokens to reward
- `userId`: The user ID to reward

**Response:**
```json
{
  "status": "success",
  "message": "Tokens successfully transferred",
  "data": {
    "userId": "user123",
    "recipient": "0x1234567890123456789012345678901234567890",
    "amount": "10.5",
    "token": {
      "address": "0xabcdef1234567890abcdef1234567890abcdef12",
      "name": "Test Token",
      "symbol": "TEST"
    },
    "transactionHash": "0x1234567890abcdef",
    "blockNumber": 12345
  }
}
```

## Architecture

- `src/index.ts`: Main application entry point
- `src/controllers/`: API route handlers
- `src/services/`: Business logic
- `src/middlewares/`: Express middlewares
- `src/models/`: Data models
- `src/routes/`: API route definitions
- `src/config/`: Configuration files
- `src/tests/`: Test files

## Note

In a production environment, you should:
- Replace the in-memory storage with a proper database
- Implement authentication and authorization
- Use environment variables securely
- Consider using a wallet service instead of storing the private key

## License

MIT 