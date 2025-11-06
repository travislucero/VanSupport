// Test script for pagination functionality
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'http://localhost:3000';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         Ticket Pagination Test Suite                        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function testPagination() {
  let allPassed = true;

  console.log('📋 This test suite will verify pagination functionality\n');
  console.log('⚠️  Note: Server must be running on http://localhost:3000\n');
  console.log('⚠️  Note: You must be logged in with valid credentials\n');

  // Test 1: Default pagination parameters
  console.log('🔍 Test 1: Default Pagination (page=1, limit=25)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/tickets/unassigned`, {
      credentials: 'include'
    });

    if (!response.ok) {
      console.log('   ❌ Failed:', response.status, response.statusText);
      console.log('   💡 Make sure server is running and you are logged in');
      allPassed = false;
    } else {
      const data = await response.json();

      if (data.tickets && data.pagination) {
        console.log('   ✅ Response structure correct');
        console.log('   📊 Pagination:', JSON.stringify(data.pagination, null, 2));
        console.log('   📊 Returned tickets:', data.tickets.length);

        if (data.pagination.page === 1 && data.pagination.limit === 25) {
          console.log('   ✅ Default values correct\n');
        } else {
          console.log('   ❌ Default values incorrect\n');
          allPassed = false;
        }
      } else {
        console.log('   ❌ Response missing tickets or pagination\n');
        allPassed = false;
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    console.log('   💡 Is the server running?\n');
    allPassed = false;
  }

  // Test 2: Custom page size
  console.log('🔍 Test 2: Custom Page Size (limit=10)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/tickets/unassigned?limit=10`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();

      if (data.pagination.limit === 10) {
        console.log('   ✅ Page size set correctly');
      } else {
        console.log('   ❌ Page size not set correctly');
        allPassed = false;
      }

      if (data.tickets.length <= 10) {
        console.log('   ✅ Returned correct number of tickets:', data.tickets.length);
      } else {
        console.log('   ❌ Returned too many tickets:', data.tickets.length);
        allPassed = false;
      }

      console.log('');
    } else {
      console.log('   ❌ Request failed\n');
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
    allPassed = false;
  }

  // Test 3: Second page
  console.log('🔍 Test 3: Second Page (page=2)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/tickets/unassigned?page=2&limit=10`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();

      if (data.pagination.page === 2) {
        console.log('   ✅ Page number correct');
      } else {
        console.log('   ❌ Page number incorrect');
        allPassed = false;
      }

      if (data.pagination.hasPreviousPage === true) {
        console.log('   ✅ hasPreviousPage is true');
      } else {
        console.log('   ❌ hasPreviousPage should be true');
        allPassed = false;
      }

      console.log('   📊 Pagination:', JSON.stringify(data.pagination, null, 2));
      console.log('');
    } else {
      console.log('   ❌ Request failed\n');
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
    allPassed = false;
  }

  // Test 4: Large page size
  console.log('🔍 Test 4: Large Page Size (limit=100)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/tickets/unassigned?limit=100`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();

      if (data.pagination.limit === 100) {
        console.log('   ✅ Large page size supported');
      } else {
        console.log('   ❌ Large page size not set correctly');
        allPassed = false;
      }

      console.log('   📊 Total tickets:', data.pagination.totalCount);
      console.log('   📊 Total pages:', data.pagination.totalPages);
      console.log('');
    } else {
      console.log('   ❌ Request failed\n');
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
    allPassed = false;
  }

  // Test 5: Invalid page size (should default to 25)
  console.log('🔍 Test 5: Invalid Page Size (limit=15, should default to 25)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/tickets/unassigned?limit=15`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();

      if (data.pagination.limit === 25) {
        console.log('   ✅ Invalid page size defaults to 25');
      } else {
        console.log('   ❌ Invalid page size handling incorrect:', data.pagination.limit);
        allPassed = false;
      }

      console.log('');
    } else {
      console.log('   ❌ Request failed\n');
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
    allPassed = false;
  }

  // Test 6: Page out of bounds
  console.log('🔍 Test 6: Page Out of Bounds (page=9999)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/tickets/unassigned?page=9999`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();

      console.log('   ✅ Request succeeds even with out-of-bounds page');
      console.log('   📊 Returned tickets:', data.tickets.length);
      console.log('   📊 Current page:', data.pagination.page);
      console.log('   📊 Total pages:', data.pagination.totalPages);
      console.log('');
    } else {
      console.log('   ❌ Request failed\n');
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
    allPassed = false;
  }

  // Test 7: My tickets pagination
  console.log('🔍 Test 7: My Tickets Pagination');
  try {
    const response = await fetch(`${API_BASE_URL}/api/tickets/my-tickets?page=1&limit=10`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();

      if (data.tickets && data.pagination) {
        console.log('   ✅ My tickets pagination working');
        console.log('   📊 Total my tickets:', data.pagination.totalCount);
        console.log('   📊 Returned:', data.tickets.length);
      } else {
        console.log('   ❌ Response structure incorrect');
        allPassed = false;
      }

      console.log('');
    } else {
      console.log('   ❌ Request failed\n');
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
    allPassed = false;
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════\n');
  if (allPassed) {
    console.log('✅ ALL PAGINATION TESTS PASSED\n');
    console.log('📌 Next Steps:');
    console.log('   1. Open the frontend dashboard');
    console.log('   2. Verify pagination controls appear at bottom of ticket lists');
    console.log('   3. Test clicking Previous/Next buttons');
    console.log('   4. Test clicking page numbers');
    console.log('   5. Test changing page size dropdown');
    console.log('   6. Verify URL updates with pagination parameters');
    console.log('   7. Test that bookmarked URLs restore correct page\n');
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    console.log('Please review the errors above and ensure:');
    console.log('   - Server is running (node server.js)');
    console.log('   - You are logged in with valid credentials');
    console.log('   - Backend pagination code is correct\n');
  }
}

testPagination().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
