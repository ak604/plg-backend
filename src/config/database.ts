import dotenv from 'dotenv';
import AWS from 'aws-sdk';

dotenv.config();

const region = process.env.AWS_REGION || 'us-east-1';
const tableName = process.env.DYNAMODB_TABLE_NAME || 'Users';
const profile = process.env.AWS_USER_PROFILE;

if (!process.env.AWS_REGION) {
  console.warn(`Warning: AWS_REGION not set, defaulting to ${region}`);
}
if (!process.env.DYNAMODB_TABLE_NAME) {
  console.warn(`Warning: DYNAMODB_TABLE_NAME not set, defaulting to ${tableName}`);
}

// Configure AWS SDK
const awsConfig: AWS.ConfigurationOptions = { region };

if (profile) {
  console.log(`Using AWS profile: ${profile}`);
  // Set credentials using the specified profile
  awsConfig.credentials = new AWS.SharedIniFileCredentials({ profile });
} else {
  console.log('Using default AWS credentials (environment variables, instance profile, or default profile).');
}

AWS.config.update(awsConfig);

// Initialize DocumentClient *after* updating AWS config
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

export const dynamoDbConfig = {
  region,
  tableName,
  profile, // Include profile in the exported config if needed elsewhere
  client: dynamoDbClient,
};

export default dynamoDbConfig; 