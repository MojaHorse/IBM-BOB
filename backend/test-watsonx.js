/**
 * Test script to verify watsonx.ai connection
 * Run with: node test-watsonx.js
 */

require('dotenv').config();
const { WatsonXAI } = require('@ibm-cloud/watsonx-ai');
const { IamAuthenticator } = require('ibm-cloud-sdk-core');

async function testWatsonXConnection() {
  console.log('🧪 Testing watsonx.ai connection...\n');

  // Check environment variables
  const requiredVars = ['WATSONX_API_KEY', 'WATSONX_PROJECT_ID'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.log('\n📝 Please set these in your .env file');
    console.log('   Copy .env.example to .env and fill in your credentials');
    process.exit(1);
  }

  try {
    // Initialize authenticator
    const authenticator = new IamAuthenticator({
      apikey: process.env.WATSONX_API_KEY,
    });

    // Initialize watsonx.ai client
    const watsonxAI = WatsonXAI.newInstance({
      version: '2024-05-31',
      authenticator: authenticator,
      serviceUrl: process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com',
    });

    console.log('✅ watsonx.ai client initialized');
    console.log(`   Service URL: ${process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com'}`);
    console.log(`   Project ID: ${process.env.WATSONX_PROJECT_ID.substring(0, 8)}...`);

    // Test simple text generation
    console.log('\n🤖 Testing text generation with Granite model...');
    
    const testPrompt = 'Explain in one sentence what a merge conflict is in Git.';
    
    const response = await watsonxAI.generateText({
      input: testPrompt,
      modelId: 'ibm/granite-3-8b-instruct',
      projectId: process.env.WATSONX_PROJECT_ID,
      parameters: {
        max_new_tokens: 100,
        temperature: 0.3,
        top_p: 0.9,
      }
    });

    console.log('✅ Text generation successful!');
    console.log('\n📝 Test Prompt:', testPrompt);
    
    // Handle different response structures
    const generatedText = response.result?.generated_text ||
                         response.result?.results?.[0]?.generated_text ||
                         response.results?.[0]?.generated_text ||
                         'Response received but text not in expected format';
    
    console.log('🤖 AI Response:', generatedText);
    
    // Token usage (if available)
    const inputTokens = response.result?.input_token_count ||
                       response.result?.results?.[0]?.input_token_count || 0;
    const generatedTokens = response.result?.generated_token_count ||
                           response.result?.results?.[0]?.generated_token_count || 0;
    
    if (inputTokens > 0 || generatedTokens > 0) {
      console.log('\n📊 Token Usage:');
      console.log('   Input tokens:', inputTokens);
      console.log('   Generated tokens:', generatedTokens);
      console.log('   Total tokens:', inputTokens + generatedTokens);
    }
    
    console.log('\n📦 Full Response Structure:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\n✨ watsonx.ai connection test PASSED!');
    console.log('   You are ready to integrate AI into your application.');
    
  } catch (error) {
    console.error('\n❌ watsonx.ai connection test FAILED');
    console.error('   Error:', error.message);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n💡 Tip: Check your WATSONX_API_KEY is correct');
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.log('\n💡 Tip: Check your WATSONX_PROJECT_ID is correct');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      console.log('\n💡 Tip: Check your internet connection and WATSONX_URL');
    }
    
    console.log('\n📚 For help, see: https://cloud.ibm.com/docs/watsonx-ai');
    process.exit(1);
  }
}

// Run the test
testWatsonXConnection();

// Made with Bob
