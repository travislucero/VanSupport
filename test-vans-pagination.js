// Test script for vans pagination functionality
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'http://localhost:3000';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         Vans Pagination Test Suite                          ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function testVansPagination() {
  let allPassed = true;

  console.log('📋 This test suite will verify vans pagination functionality\n');
  console.log('⚠️  Note: Server must be running on http://localhost:3000\n');
  console.log('⚠️  Note: You must be logged in with valid credentials\n');

  // Test 1: Default pagination parameters
  console.log('🔍 Test 1: Default Pagination (page=1, limit=25)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/vans`, {
      credentials: 'include'
    });

    if (!response.ok) {
      console.log('   ❌ Failed:', response.status, response.statusText);
      console.log('   💡 Make sure server is running and you are logged in');
      allPassed = false;
    } else {
      const data = await response.json();

      if (data.vans && data.pagination) {
        console.log('   ✅ Response structure correct');
        console.log('   📊 Pagination:', JSON.stringify(data.pagination, null, 2));
        console.log('   📊 Returned vans:', data.vans.length);

        if (data.pagination.page === 1 && data.pagination.limit === 25) {
          console.log('   ✅ Default values correct\n');
        } else {
          console.log('   ❌ Default values incorrect\n');
          allPassed = false;
        }
      } else {
        console.log('   ❌ Response missing vans or pagination\n');
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
    const response = await fetch(`${API_BASE_URL}/api/vans?limit=10`, {
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

      if (data.vans.length <= 10) {
        console.log('   ✅ Returned correct number of vans:', data.vans.length);
      } else {
        console.log('   ❌ Returned too many vans:', data.vans.length);
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
    const response = await fetch(`${API_BASE_URL}/api/vans?page=2&limit=10`, {
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

      if (data.pagination.totalPages >= 2 && data.pagination.hasPreviousPage === true) {
        console.log('   ✅ hasPreviousPage is true');
      } else if (data.pagination.totalPages < 2) {
        console.log('   ⚠️  Only one page of vans exists (need more test data)');
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
    const response = await fetch(`${API_BASE_URL}/api/vans?limit=100`, {
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

      console.log('   📊 Total vans:', data.pagination.totalCount);
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
    const response = await fetch(`${API_BASE_URL}/api/vans?limit=15`, {
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

  // Test 6: Verify sorting (by van_number)
  console.log('🔍 Test 6: Verify Sorting by van_number');
  try {
    const response = await fetch(`${API_BASE_URL}/api/vans?limit=10`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();

      if (data.vans && data.vans.length >= 2) {
        const isSorted = data.vans.every((van, idx, arr) => {
          if (idx === 0) return true;
          return arr[idx - 1].van_number <= van.van_number;
        });

        if (isSorted) {
          console.log('   ✅ Vans sorted by van_number');
        } else {
          console.log('   ❌ Vans not properly sorted');
          allPassed = false;
        }

        console.log('   📊 First 3 vans:', data.vans.slice(0, 3).map(v => v.van_number).join(', '));
      } else {
        console.log('   ⚠️  Not enough vans to verify sorting');
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

  // Test 7: Verify owner information is included
  console.log('🔍 Test 7: Verify Owner Information');
  try {
    const response = await fetch(`${API_BASE_URL}/api/vans?limit=5`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();

      if (data.vans && data.vans.length > 0) {
        const hasOwnerInfo = data.vans.every(van =>
          van.owner && typeof van.owner === 'object'
        );

        if (hasOwnerInfo) {
          console.log('   ✅ Owner information present on all vans');
        } else {
          console.log('   ❌ Owner information missing on some vans');
          allPassed = false;
        }

        console.log('   📊 Sample van:', {
          van_number: data.vans[0].van_number,
          make: data.vans[0].make,
          owner_name: data.vans[0].owner?.name
        });
      } else {
        console.log('   ⚠️  No vans to verify');
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
    console.log('✅ ALL VANS PAGINATION TESTS PASSED\n');
    console.log('📌 Next Steps:');
    console.log('   1. Open the frontend dashboard');
    console.log('   2. Navigate to the Vans page');
    console.log('   3. Verify pagination controls appear at bottom of vans list');
    console.log('   4. Test clicking Previous/Next buttons');
    console.log('   5. Test clicking page numbers');
    console.log('   6. Test changing page size dropdown');
    console.log('   7. Verify URL updates with pagination parameters');
    console.log('   8. Test that bookmarked URLs restore correct page');
    console.log('   9. Verify van count badge in header\n');
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    console.log('Please review the errors above and ensure:');
    console.log('   - Server is running (node server.js)');
    console.log('   - You are logged in with valid credentials');
    console.log('   - Backend pagination code is correct\n');
  }
}

testVansPagination().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
