/**
 * Script to unresolve a ticket - changes status from closed/resolved back to open
 * and clears resolution-related fields.
 *
 * Usage: node unresolve-ticket.js <ticket_number>
 * Example: node unresolve-ticket.js 58
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ticketNumber = process.argv[2] ? parseInt(process.argv[2], 10) : 58;

if (isNaN(ticketNumber)) {
  console.error('Error: Invalid ticket number provided');
  process.exit(1);
}

async function unresolveTicket(ticketNum) {
  console.log(`\n=== Unresolving Ticket #${ticketNum} ===\n`);

  // Step 1: Find the ticket by ticket_number
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('id, ticket_number, subject, status, resolution, resolved_at, resolved_by')
    .eq('ticket_number', ticketNum)
    .single();

  if (fetchError) {
    console.error('Error fetching ticket:', fetchError.message);
    process.exit(1);
  }

  if (!ticket) {
    console.error(`Ticket #${ticketNum} not found`);
    process.exit(1);
  }

  console.log('Current ticket state:');
  console.log(`  ID: ${ticket.id}`);
  console.log(`  Ticket Number: ${ticket.ticket_number}`);
  console.log(`  Subject: ${ticket.subject}`);
  console.log(`  Status: ${ticket.status}`);
  console.log(`  Resolution: ${ticket.resolution || '(none)'}`);
  console.log(`  Resolved At: ${ticket.resolved_at || '(none)'}`);
  console.log(`  Resolved By: ${ticket.resolved_by || '(none)'}`);

  // Check if ticket is already open
  if (ticket.status === 'open' || ticket.status === 'new') {
    console.log(`\nTicket #${ticketNum} is already open (status: ${ticket.status}). No changes needed.`);
    process.exit(0);
  }

  // Step 2: Update the ticket to unresolve it
  const { data: updatedTicket, error: updateError } = await supabase
    .from('tickets')
    .update({
      status: 'open',
      resolution: null,
      resolved_at: null,
      resolved_by: null
    })
    .eq('id', ticket.id)
    .select('id, ticket_number, subject, status, resolution, resolved_at, resolved_by')
    .single();

  if (updateError) {
    console.error('\nError updating ticket:', updateError.message);
    process.exit(1);
  }

  console.log('\n--- Update Successful ---');
  console.log('New ticket state:');
  console.log(`  ID: ${updatedTicket.id}`);
  console.log(`  Ticket Number: ${updatedTicket.ticket_number}`);
  console.log(`  Subject: ${updatedTicket.subject}`);
  console.log(`  Status: ${updatedTicket.status}`);
  console.log(`  Resolution: ${updatedTicket.resolution || '(cleared)'}`);
  console.log(`  Resolved At: ${updatedTicket.resolved_at || '(cleared)'}`);
  console.log(`  Resolved By: ${updatedTicket.resolved_by || '(cleared)'}`);

  console.log(`\nTicket #${ticketNum} has been successfully unresolved and set back to 'open' status.\n`);
}

unresolveTicket(ticketNumber).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
