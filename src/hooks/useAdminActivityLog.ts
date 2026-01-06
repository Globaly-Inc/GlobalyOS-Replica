import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AdminActionType =
  | 'org_created'
  | 'org_updated'
  | 'org_activated'
  | 'org_deactivated'
  | 'org_deleted'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_canceled'
  | 'payment_recorded'
  | 'coupon_applied'
  | 'coupon_removed'
  | 'feature_enabled'
  | 'feature_disabled'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'trial_extended';

export type EntityType =
  | 'organization'
  | 'subscription'
  | 'payment'
  | 'coupon'
  | 'feature'
  | 'member';

interface LogActivityParams {
  organizationId: string;
  actionType: AdminActionType;
  entityType: EntityType;
  entityId?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
}

export const useAdminActivityLog = () => {
  const logActivity = async ({
    organizationId,
    actionType,
    entityType,
    entityId,
    changes,
    metadata
  }: LogActivityParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found for activity logging');
        return;
      }

      const { error } = await supabase
        .from('super_admin_activity_logs')
        .insert([{
          admin_user_id: user.id,
          organization_id: organizationId,
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId || null,
          changes: (changes || null) as Json,
          metadata: (metadata || null) as Json
        }]);

      if (error) {
        console.error('Error logging activity:', error);
      }
    } catch (err) {
      console.error('Error in logActivity:', err);
    }
  };

  return { logActivity };
};
