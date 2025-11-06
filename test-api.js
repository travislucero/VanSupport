// Script to test the API endpoints
const API_BASE_URL = 'http://localhost:3000';

// You'll need to login first to get a valid cookie
// For now, let's just test if the server is responding

async function testAPI() {
  console.log('=== Testing Ticket API Endpoints ===\n');

  try {
    // Test if server is running
    const response = await fetch(`${API_BASE_URL}/api/tickets/unassigned`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);

    const data = await response.json();
    console.log('\nResponse:', JSON.stringify(data, null, 2));

    if (response.ok && Array.isArray(data)) {
      console.log(`\n✅ Server returned ${data.length} unassigned tickets`);
    } else {
      console.log('\n❌ Server response indicates an issue (likely auth required)');
    }
  } catch (error) {
    console.error('❌ Error connecting to server:', error.message);
    console.log('\nIs the server running? Try: node server.js');
  }
}

testAPI();
