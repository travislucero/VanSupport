/**
 * Script to fix ticket #58's resolution field
 *
 * This script finds the resolution comment (is_resolution: true) from the comments table
 * and updates the ticket's resolution field with that comment text.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TICKET_NUMBER = 58;

async function fixTicketResolution() {
  console.log(`\n🔍 Finding ticket #${TICKET_NUMBER}...`);

  // Step 0: Find the ticket UUID by ticket number
  const { data: ticketLookup, error: lookupError } = await supabase
    .from("tickets")
    .select("id, ticket_number, resolution")
    .eq("ticket_number", TICKET_NUMBER)
    .single();

  if (lookupError) {
    console.error("❌ Error finding ticket:", lookupError.message);
    process.exit(1);
  }

  if (!ticketLookup) {
    console.log(`⚠️  Ticket #${TICKET_NUMBER} not found`);
    process.exit(0);
  }

  const ticketId = ticketLookup.id;
  console.log(`✅ Found ticket #${TICKET_NUMBER} (UUID: ${ticketId})`);
  console.log(`   Current resolution: ${ticketLookup.resolution ? `"${ticketLookup.resolution.substring(0, 50)}..."` : "(empty)"}`);

  // Step 1: Find the resolution comment
  console.log(`\n🔍 Finding resolution comment...`);
  const { data: comments, error: commentError } = await supabase
    .from("ticket_comments")
    .select("id, comment_text, is_resolution, created_at")
    .eq("ticket_id", ticketId)
    .eq("is_resolution", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (commentError) {
    console.error("❌ Error fetching resolution comment:", commentError.message);
    process.exit(1);
  }

  if (!comments || comments.length === 0) {
    console.log("⚠️  No resolution comment found for ticket #58");
    process.exit(0);
  }

  const resolutionComment = comments[0];
  console.log(`✅ Found resolution comment (ID: ${resolutionComment.id})`);
  console.log(`   Content: "${resolutionComment.comment_text.substring(0, 100)}${resolutionComment.comment_text.length > 100 ? '...' : ''}"`);
  console.log(`   Created at: ${resolutionComment.created_at}`);

  // Step 2: Update the ticket's resolution field
  console.log(`\n📝 Updating ticket #${TICKET_NUMBER}'s resolution field...`);

  const { data: ticket, error: updateError } = await supabase
    .from("tickets")
    .update({ resolution: resolutionComment.comment_text })
    .eq("id", ticketId)
    .select("id, resolution")
    .single();

  if (updateError) {
    console.error("❌ Error updating ticket resolution:", updateError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully updated ticket #${TICKET_NUMBER}`);
  console.log(`   New resolution: "${ticket.resolution.substring(0, 100)}${ticket.resolution.length > 100 ? '...' : ''}"`);
  console.log("\n🎉 Done!");
}

fixTicketResolution();
