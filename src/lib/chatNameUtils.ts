import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if a space or group chat name already exists in the organization.
 * Returns true if the name is taken.
 */
export async function isSpaceOrGroupNameTaken(
  orgId: string,
  name: string,
  excludeSpaceId?: string,
  excludeConversationId?: string,
): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed) return false;

  // Check spaces (non-archived)
  let spaceQuery = supabase
    .from('chat_spaces')
    .select('id')
    .eq('organization_id', orgId)
    .ilike('name', trimmed)
    .is('archived_at', null)
    .limit(1);

  if (excludeSpaceId) {
    spaceQuery = spaceQuery.neq('id', excludeSpaceId);
  }

  // Check group conversations
  let groupQuery = supabase
    .from('chat_conversations')
    .select('id')
    .eq('organization_id', orgId)
    .eq('is_group', true)
    .ilike('name', trimmed)
    .limit(1);

  if (excludeConversationId) {
    groupQuery = groupQuery.neq('id', excludeConversationId);
  }

  const [{ data: existingSpace }, { data: existingGroup }] = await Promise.all([
    spaceQuery,
    groupQuery,
  ]);

  return !!(existingSpace?.length || existingGroup?.length);
}
