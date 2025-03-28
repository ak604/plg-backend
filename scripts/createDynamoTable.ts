import { 
  DynamoDBClient, 
  CreateTableCommand, 
  waitUntilTableExists, 
  BillingMode, 
  AttributeDefinition, 
  KeySchemaElement, 
  Tag, 
  KeyType, 
  ScalarAttributeType 
} from '@aws-sdk/client-dynamodb';
import { fromIni } from '@aws-sdk/credential-providers';
import dotenv from 'dotenv';

dotenv.config(); // Load .env variables

const region = process.env.AWS_REGION || 'us-east-1';
const tableName = process.env.DYNAMODB_TABLE_NAME || 'Users';
const profile = process.env.AWS_USER_PROFILE;

// --- AWS SDK v3 Client Creation ---
let client: DynamoDBClient;

if (profile) {
  console.log(`Using AWS profile: ${profile} for DynamoDB client in script.`);
  const credentials = fromIni({ profile }); // Credential provider function
  client = new DynamoDBClient({ region, credentials });
} else {
  console.log('Using default AWS credentials for DynamoDB client in script.');
  client = new DynamoDBClient({ region });
}
// --- End Client Creation ---

// Define table parameters using v3 types
const attributeDefinitions: AttributeDefinition[] = [
  {
    AttributeName: 'userId', 
    AttributeType: ScalarAttributeType.S, // Use enum for type safety
  },
  // Add GSI attributes here if needed
];

const keySchema: KeySchemaElement[] = [
  {
    AttributeName: 'userId',
    KeyType: KeyType.HASH, // Use enum for type safety
  },
];

const tags: Tag[] = [
  {
    Key: 'Project',
    Value: 'CryptoRewardsAPI'
  }
];

const createTableCommand = new CreateTableCommand({
  TableName: tableName,
  AttributeDefinitions: attributeDefinitions,
  KeySchema: keySchema,
  BillingMode: BillingMode.PAY_PER_REQUEST, // Use enum
  Tags: tags,
  // Add GlobalSecondaryIndexes here if needed
});

async function createTable() {
  console.log(`Attempting to create table: ${tableName} in region ${region}...`);
  try {
    const data = await client.send(createTableCommand);
    console.log(`Successfully sent CreateTable command for '${tableName}'. Response:`);
    console.log(JSON.stringify(data, null, 2));

    // Wait for the table to become active using v3 waiter
    console.log(`Waiting for table '${tableName}' to become active...`);
    const waiterConfig = { client, maxWaitTime: 180 }; // client + options
    await waitUntilTableExists(waiterConfig, { TableName: tableName });
    console.log(`Table '${tableName}' is now active.`);

  } catch (err: any) {
    if (err.name === 'ResourceInUseException') {
      console.log(`Table '${tableName}' already exists. No action taken.`);
    } else if (err.name === 'CredentialsProviderError' || err.message?.includes('load config file') || err.name === 'TokenProviderError') {
      console.error(`Error creating table '${tableName}': AWS Credentials/Token Error.`);
      console.error('Please ensure your AWS credentials are configured correctly.');
      console.error(`- Check if profile '${profile}' exists in your ~/.aws/credentials or ~/.aws/config file.`);
      console.error(`- If using IAM Identity Center (SSO), ensure you are logged in (e.g., \`aws sso login --profile ${profile}\`).`);
      console.error(`- Check environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).`);
      console.error(`Original Error: ${err.message}`);
    } else {
      console.error(`Error creating table '${tableName}':`, err);
    }
  }
}

// Execute the function
createTable(); 