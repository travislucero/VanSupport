// Comprehensive diagnostic script for ticket display issues
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║       VanSupport Ticket Display Diagnostic Tool              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function runDiagnostics() {
  let allPassed = true;

  // Test 1: Database Connection
  console.log('🔍 Test 1: Database Connection');
  try {
    const { error } = await supabase.from('tickets').select('id').limit(1);
    if (error) throw error;
    console.log('   ✅ Database connection successful\n');
  } catch (error) {
    console.log('   ❌ Database connection failed:', error.message);
    allPassed = false;
  }

  // Test 2: Ticket Count in Database
  console.log('🔍 Test 2: Ticket Count in Database');
  try {
    const { data: allTickets, error: allError } = await supabase
      .from('tickets')
      .select('id');

    const { data: unassigned, error: unassignedError } = await supabase
      .from('tickets')
      .select('id')
      .is('assigned_to', null);

    const { data: assigned, error: assignedError } = await supabase
      .from('tickets')
      .select('id')
      .not('assigned_to', 'is', null);

    if (allError || unassignedError || assignedError) throw allError || unassignedError || assignedError;

    console.log(`   ✅ Total tickets in database: ${allTickets.length}`);
    console.log(`   ✅ Unassigned tickets: ${unassigned.length}`);
    console.log(`   ✅ Assigned tickets: ${assigned.length}\n`);

    if (allTickets.length === 0) {
      console.log('   ⚠️  WARNING: No tickets found in database!\n');
    }
  } catch (error) {
    console.log('   ❌ Error counting tickets:', error.message);
    allPassed = false;
  }

  // Test 3: fn_get_tech_tickets Function (Unassigned)
  console.log('🔍 Test 3: fn_get_tech_tickets(NULL) - Unassigned Tickets');
  try {
    const { data, error } = await supabase.rpc('fn_get_tech_tickets', {
      p_tech_user_id: null
    });

    if (error) throw error;

    console.log(`   ✅ Function returned ${data.length} unassigned tickets`);

    if (data.length > 0) {
      const statuses = [...new Set(data.map(t => t.status))];
      console.log(`   ✅ Statuses found: ${statuses.join(', ')}`);

      console.log('\n   📋 Most recent unassigned tickets:');
      data.slice(0, 5).forEach(t => {
        console.log(`      #${t.ticket_number} - ${t.subject} (${t.status}) - ${t.created_at}`);
      });
    } else {
      console.log('   ⚠️  WARNING: Function returned 0 tickets!');
    }
    console.log('');
  } catch (error) {
    console.log('   ❌ Error calling fn_get_tech_tickets:', error.message);
    allPassed = false;
  }

  // Test 4: Recent Ticket Activity
  console.log('🔍 Test 4: Recent Ticket Activity');
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('ticket_number, subject, status, created_at, assigned_to')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    console.log('   ✅ 5 most recent tickets:');
    data.forEach(t => {
      const assignedStatus = t.assigned_to ? 'ASSIGNED' : 'UNASSIGNED';
      console.log(`      #${t.ticket_number} - ${t.subject}`);
      console.log(`         Status: ${t.status} | ${assignedStatus} | Created: ${t.created_at}`);
    });
    console.log('');
  } catch (error) {
    console.log('   ❌ Error fetching recent tickets:', error.message);
    allPassed = false;
  }

  // Test 5: Status Distribution
  console.log('🔍 Test 5: Ticket Status Distribution');
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('status');

    if (error) throw error;

    const statusCounts = {};
    data.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    console.log('   ✅ Ticket counts by status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`      ${status}: ${count}`);
    });
    console.log('');
  } catch (error) {
    console.log('   ❌ Error analyzing status distribution:', error.message);
    allPassed = false;
  }

  // Test 6: User Roles Check
  console.log('🔍 Test 6: User Roles Configuration');
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email');

    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role_id');

    const { data: roles, error: rolesListError } = await supabase
      .from('roles')
      .select('id, name');

    if (usersError || rolesError || rolesListError) {
      throw usersError || rolesError || rolesListError;
    }

    console.log(`   ✅ Total users: ${users.length}`);
    console.log(`   ✅ Users with roles: ${[...new Set(userRoles.map(ur => ur.user_id))].length}`);
    console.log(`   ✅ Available roles: ${roles.map(r => r.name).join(', ')}\n`);

    // Check for manager/admin users
    const roleMap = {};
    roles.forEach(r => { roleMap[r.id] = r.name; });

    const usersWithManagerOrAdmin = userRoles.filter(ur => {
      const roleName = roleMap[ur.role_id];
      return roleName === 'manager' || roleName === 'admin';
    });

    if (usersWithManagerOrAdmin.length === 0) {
      console.log('   ⚠️  WARNING: No users have manager or admin role!');
      console.log('      Users need manager/admin role to view tickets.\n');
    } else {
      console.log(`   ✅ ${usersWithManagerOrAdmin.length} user(s) have manager/admin access\n`);
    }
  } catch (error) {
    console.log('   ⚠️  Could not verify user roles:', error.message);
    console.log('      (This might be expected if using a different auth system)\n');
  }

  // Test 7: Environment Configuration
  console.log('🔍 Test 7: Environment Configuration');
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    console.log(`   ❌ Missing environment variables: ${missingVars.join(', ')}`);
    allPassed = false;
  } else {
    console.log('   ✅ All required environment variables are set');
  }

  console.log(`   📝 SUPABASE_URL: ${process.env.SUPABASE_URL}`);
  console.log(`   📝 PORT: ${process.env.PORT || '3000 (default)'}`);
  console.log('');

  // Summary
  console.log('═══════════════════════════════════════════════════════════════\n');
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED\n');
    console.log('The backend system is configured correctly.');
    console.log('\n📌 Next Steps:');
    console.log('   1. Ensure backend server is running: node server.js');
    console.log('   2. Ensure frontend dev server is running: cd dashboard && npm run dev');
    console.log('   3. Login to http://localhost:5173 with manager/admin user');
    console.log('   4. Navigate to Tickets page');
    console.log('   5. Tickets should appear in the dashboard\n');

    console.log('📝 Troubleshooting:');
    console.log('   - If tickets still don\'t appear, check browser console (F12)');
    console.log('   - Verify API calls to /api/tickets/unassigned return 200 OK');
    console.log('   - Check server logs for any errors');
    console.log('   - Ensure user is logged in and has manager/admin role\n');
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    console.log('Please review the errors above and fix the issues.\n');
  }
}

runDiagnostics().catch(error => {
  console.error('Fatal error running diagnostics:', error);
  process.exit(1);
});
