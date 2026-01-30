/**
 * Chat Services - Barrel exports
 * Maintains backward compatibility while allowing modular imports
 */

// Re-export all hooks from the monolithic file for backward compatibility
// This allows existing imports to continue working:
// import { useConversations } from "@/services/useChat"
export * from './queries/useConversations';
export * from './queries/useSpaces';
export * from './queries/useMessages';
export * from './queries/usePresence';
export * from './mutations/useMessageMutations';
export * from './mutations/useConversationMutations';
export * from './mutations/useSpaceMutations';
export * from './mutations/useMemberMutations';
export * from './mutations/useReactionMutations';
