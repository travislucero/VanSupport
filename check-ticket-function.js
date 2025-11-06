// Script to check the fn_get_tech_tickets function definition
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFunction() {
  console.log('=== Checking fn_get_tech_tickets function ===\n');

  // Get the function definition
  const { data: functionDef, error: funcError } = await supabase.rpc('pg_get_functiondef', {
    funcoid: 'fn_get_tech_tickets'
  }).single();

  if (funcError) {
    console.log('Could not get function via pg_get_functiondef, trying direct query...');

    // Try to query the function definition from pg_proc
    const { data: procData, error: procError } = await supabase
      .from('pg_proc')
      .select('proname, prosrc')
      .eq('proname', 'fn_get_tech_tickets')
      .single();

    if (procError) {
      console.error('Error getting function:', procError);
    } else {
      console.log('Function source:', procData.prosrc);
    }
  } else {
    console.log('Function definition:', functionDef);
  }

  // Test the function with null (unassigned tickets)
  console.log('\n=== Testing fn_get_tech_tickets with NULL (unassigned) ===');
  const { data: unassignedData, error: unassignedError } = await supabase.rpc('fn_get_tech_tickets', {
    p_tech_user_id: null
  });

  if (unassignedError) {
    console.error('Error:', unassignedError);
  } else {
    console.log(`Found ${unassignedData.length} unassigned tickets`);
    if (unassignedData.length > 0) {
      console.log('\nFirst unassigned ticket:');
      console.log(JSON.stringify(unassignedData[0], null, 2));
      console.log('\nAll statuses found:', [...new Set(unassignedData.map(t => t.status))]);
    }
  }

  // Query tickets table directly to see what's there
  console.log('\n=== Querying tickets table directly ===');
  const { data: allTickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, ticket_number, subject, status, assigned_to, created_at, priority')
    .order('created_at', { ascending: false })
    .limit(10);

  if (ticketsError) {
    console.error('Error:', ticketsError);
  } else {
    console.log(`Found ${allTickets.length} most recent tickets:`);
    allTickets.forEach(t => {
      console.log(`  #${t.ticket_number} - ${t.subject} - Status: ${t.status} - Assigned: ${t.assigned_to || 'UNASSIGNED'} - Created: ${t.created_at}`);
    });

    // Count by status
    console.log('\n=== Ticket counts by status (all tickets) ===');
    const { data: statusCounts } = await supabase
      .from('tickets')
      .select('status');

    const counts = {};
    statusCounts.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    console.log(counts);

    // Count unassigned
    const { data: unassignedCount } = await supabase
      .from('tickets')
      .select('id')
      .is('assigned_to', null);

    console.log(`\nTotal unassigned tickets in DB: ${unassignedCount.length}`);
  }
}

checkFunction().catch(console.error);
