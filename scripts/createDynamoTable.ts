import AWS from 'aws-sdk';
import dynamoDbConfig from '../src/config/database'; // Adjust path if necessary

// --- AWS SDK Configuration --- 
// The configuration (including profile credentials) is now handled 
// within the imported dynamoDbConfig module when it initializes AWS.config.
// No need to explicitly set credentials here again.
// --- End AWS SDK Configuration ---

const dynamodb = new AWS.DynamoDB(); // Uses the globally configured AWS settings
const tableName = dynamoDbConfig.tableName;

const params: AWS.DynamoDB.CreateTableInput = {
  TableName: tableName,
  AttributeDefinitions: [
    {
      AttributeName: 'userId', // Name of the attribute
      AttributeType: 'S',     // Type: S for String, N for Number, B for Binary
    },
    // Add other attributes here if needed for Global Secondary Indexes (GSIs)
    // Example for a GSI on walletAddress:
    // {
    //   AttributeName: 'walletAddress',
    //   AttributeType: 'S',
    // },
  ],
  KeySchema: [
    {
      AttributeName: 'userId',
      KeyType: 'HASH', // HASH = Partition Key
    },
    // Use RANGE for Sort Key if needed
  ],
  // Using On-Demand capacity is often simpler for development
  BillingMode: 'PAY_PER_REQUEST',
  // Alternatively, specify ProvisionedThroughput:
  // ProvisionedThroughput: {
  //   ReadCapacityUnits: 5,
  //   WriteCapacityUnits: 5,
  // },

  // Example of adding a Global Secondary Index (GSI) on walletAddress
  // GlobalSecondaryIndexes: [
  //   {
  //     IndexName: 'WalletAddressIndex',
  //     KeySchema: [
  //       {
  //         AttributeName: 'walletAddress',
  //         KeyType: 'HASH',
  //       },
  //     ],
  //     Projection: {
  //       ProjectionType: 'ALL', // Or 'KEYS_ONLY' or 'INCLUDE'
  //     },
       // If using ProvisionedThroughput for the table, specify it for the GSI too
  //     // ProvisionedThroughput: {
  //     //   ReadCapacityUnits: 5,
  //     //   WriteCapacityUnits: 5,
  //     // },
  //   },
  // ],
  Tags: [
    {
        Key: 'Project',
        Value: 'CryptoRewardsAPI'
    }
  ]
};

async function createTable() {
  console.log(`Attempting to create table: ${tableName} in region ${dynamoDbConfig.region}...`);
  if (dynamoDbConfig.profile) {
    console.log(`Using AWS profile: ${dynamoDbConfig.profile}`);
  }
  try {
    const data = await dynamodb.createTable(params).promise();
    console.log(`Successfully created table '${tableName}'. Full response:`);
    console.log(JSON.stringify(data, null, 2));

    // Wait for the table to become active
    console.log(`Waiting for table '${tableName}' to become active...`);
    await dynamodb.waitFor('tableExists', { TableName: tableName }).promise();
    console.log(`Table '${tableName}' is now active.`);

  } catch (err: any) {
    if (err.code === 'ResourceInUseException') {
      console.log(`Table '${tableName}' already exists. No action taken.`);
    } else {
      console.error(`Error creating table '${tableName}':`, err);
    } 
  }
}

// Execute the function
createTable(); 