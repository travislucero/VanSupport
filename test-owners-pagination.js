// Test script for owners pagination functionality
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'http://localhost:3000';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         Owners Pagination Test Suite                        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function testOwnersPagination() {
  let allPassed = true;

  console.log('📋 This test suite will verify owners pagination functionality\n');
  console.log('⚠️  Note: Server must be running on http://localhost:3000\n');
  console.log('⚠️  Note: You must be logged in with valid credentials\n');

  // Test 1: Default pagination parameters
  console.log('🔍 Test 1: Default Pagination (page=1, limit=25)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/owners`, {
      credentials: 'include'
    });

    if (!response.ok) {
      console.log('   ❌ Failed:', response.status, response.statusText);
      console.log('   💡 Make sure server is running and you are logged in');
      allPassed = false;
    } else {
      const data = await response.json();

      if (data.owners && data.pagination) {
        console.log('   ✅ Response structure correct');
        console.log('   📊 Pagination:', JSON.stringify(data.pagination, null, 2));
        console.log('   📊 Returned owners:', data.owners.length);

        if (data.pagination.page === 1 && data.pagination.limit === 25) {
          console.log('   ✅ Default values correct\n');
        } else {
          console.log('   ❌ Default values incorrect\n');
          allPassed = false;
        }
      } else {
        console.log('   ❌ Response missing owners or pagination\n');
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
    const response = await fetch(`${API_BASE_URL}/api/owners?limit=10`, {
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

      if (data.owners.length <= 10) {
        console.log('   ✅ Returned correct number of owners:', data.owners.length);
      } else {
        console.log('   ❌ Returned too many owners:', data.owners.length);
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
    const response = await fetch(`${API_BASE_URL}/api/owners?page=2&limit=10`, {
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
        console.log('   ⚠️  Only one page of owners exists (need more test data)');
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
    const response = await fetch(`${API_BASE_URL}/api/owners?limit=100`, {
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

      console.log('   📊 Total owners:', data.pagination.totalCount);
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
    const response = await fetch(`${API_BASE_URL}/api/owners?limit=15`, {
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

  // Test 6: Verify sorting (alphabetically by name)
  console.log('🔍 Test 6: Verify Alphabetical Sorting');
  try {
    const response = await fetch(`${API_BASE_URL}/api/owners?limit=10`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();

      if (data.owners && data.owners.length >= 2) {
        const isSorted = data.owners.every((owner, idx, arr) => {
          if (idx === 0) return true;
          return arr[idx - 1].name.toLowerCase() <= owner.name.toLowerCase();
        });

        if (isSorted) {
          console.log('   ✅ Owners sorted alphabetically by name');
        } else {
          console.log('   ❌ Owners not properly sorted');
          allPassed = false;
        }

        console.log('   📊 First 3 owners:', data.owners.slice(0, 3).map(o => o.name).join(', '));
      } else {
        console.log('   ⚠️  Not enough owners to verify sorting');
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

  // Test 7: Verify van_count is included
  console.log('🔍 Test 7: Verify van_count Field');
  try {
    const response = await fetch(`${API_BASE_URL}/api/owners?limit=5`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();

      if (data.owners && data.owners.length > 0) {
        const hasVanCount = data.owners.every(owner => typeof owner.van_count === 'number');

        if (hasVanCount) {
          console.log('   ✅ van_count field present on all owners');
        } else {
          console.log('   ❌ van_count field missing on some owners');
          allPassed = false;
        }

        console.log('   📊 Sample owner:', {
          name: data.owners[0].name,
          van_count: data.owners[0].van_count
        });
      } else {
        console.log('   ⚠️  No owners to verify');
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
    console.log('✅ ALL OWNERS PAGINATION TESTS PASSED\n');
    console.log('📌 Next Steps:');
    console.log('   1. Open the frontend dashboard');
    console.log('   2. Navigate to the Owners page');
    console.log('   3. Verify pagination controls appear at bottom of owners list');
    console.log('   4. Test clicking Previous/Next buttons');
    console.log('   5. Test clicking page numbers');
    console.log('   6. Test changing page size dropdown');
    console.log('   7. Verify URL updates with pagination parameters');
    console.log('   8. Test that bookmarked URLs restore correct page');
    console.log('   9. Verify owner count badge in header\n');
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    console.log('Please review the errors above and ensure:');
    console.log('   - Server is running (node server.js)');
    console.log('   - You are logged in with valid credentials');
    console.log('   - Backend pagination code is correct\n');
  }
}

testOwnersPagination().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
