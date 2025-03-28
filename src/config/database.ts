import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { fromIni } from '@aws-sdk/credential-providers';
import { Provider } from '@aws-sdk/types'; // Import Provider type
import { Credentials } from '@aws-sdk/client-sts'; // Import Credentials type

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

// --- AWS SDK v3 Configuration --- 
let credentialsProvider: Provider<Credentials> | undefined = undefined;

if (profile) {
  console.log(`Using AWS profile: ${profile}`);
  // Use fromIni to load credentials from the specified profile
  // This provider will automatically handle refreshing SSO credentials if needed
  credentialsProvider = fromIni({ profile });
} else {
  console.log('Using default AWS credentials provider chain (environment, instance profile, etc.).');
  // If no profile, the DynamoDBClient will use the default provider chain
}

// Create the DynamoDB Client
// Pass the credentials provider if a profile was specified
const dynamoDbClient = new DynamoDBClient({
  region,
  credentials: credentialsProvider, // Pass the provider function or undefined
});

// Create the DynamoDB Document Client (using marshallOptions for flexibility)
const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // Default is false
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true, // Default is false - SETTING TO TRUE for convenience
  // Whether to convert typeof object supporting Buffer into Blob type.
  convertClassInstanceToMap: false, // Default is false
};
const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // Default is false
};
const translateConfig = { marshallOptions, unmarshallOptions };
const docClient = DynamoDBDocumentClient.from(dynamoDbClient, translateConfig);

export const dynamoDbConfig = {
  region,
  tableName,
  profile,
  client: docClient, // Export the DocumentClient
};

export default dynamoDbConfig; 