import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CommentInteraction,
  Conversation,
  GroupChat,
  GroupMessage,
  Notification,
  NotificationCount,
  Post,
  ProfileFilter,
  ProfileWithPrincipal,
  RoseTransaction,
  SearchResult,
  Story,
  UserProfile,
} from "../backend";
import { useActor } from "./useActor";

// Helper to convert Principal | string to Principal
function toPrincipal(p: Principal | string): Principal {
  if (typeof p === "string") return Principal.fromText(p);
  return p;
}

// Helper to make a filter serializable (convert BigInt to string for query keys)
function serializableFilter(filter: ProfileFilter): Record<string, unknown> {
  return {
    country: filter.country,
    minAge: filter.minAge !== undefined ? filter.minAge.toString() : undefined,
    maxAge: filter.maxAge !== undefined ? filter.maxAge.toString() : undefined,
    gender: filter.gender,
    minBalance: filter.minBalance,
  };
}

// User Profile Hooks
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      try {
        return await actor.getCallerUserProfile();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(profileId: Principal | string | null) {
  const { actor } = useActor();
  const profileIdStr = profileId ? toPrincipal(profileId).toText() : null;

  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", profileIdStr],
    queryFn: async () => {
      if (!actor || !profileId) return null;
      try {
        return await actor.getUserProfile({
          profileId: toPrincipal(profileId),
        });
      } catch {
        return null;
      }
    },
    enabled: !!actor && !!profileId,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useDeleteCallerProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteCallerProfile();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useFilterProfiles(filter: ProfileFilter) {
  const { actor } = useActor();

  return useQuery<ProfileWithPrincipal[]>({
    // Use a serializable version of the filter for the query key to avoid BigInt serialization errors
    queryKey: ["profiles", serializableFilter(filter)],
    queryFn: async () => {
      if (!actor) return [];
      return actor.filterProfiles(filter);
    },
    enabled: !!actor,
  });
}

// Dealers hook: users with 50+ roses balance
export function useGetDealers() {
  const { actor } = useActor();

  return useQuery<ProfileWithPrincipal[]>({
    queryKey: ["dealers"],
    queryFn: async () => {
      if (!actor) return [];
      const results = await actor.filterProfiles({ minBalance: 50 });
      return results;
    },
    enabled: !!actor,
  });
}

// Follow Hooks
export function useFollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUser: Principal | string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.followUser(toPrincipal(targetUser));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing"] });
      queryClient.invalidateQueries({ queryKey: ["followerCount"] });
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUser: Principal | string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unfollowUser(toPrincipal(targetUser));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing"] });
      queryClient.invalidateQueries({ queryKey: ["followerCount"] });
    },
  });
}

export function useIsFollowing(targetUser: Principal | string | null) {
  const { actor } = useActor();
  const targetStr = targetUser ? toPrincipal(targetUser).toText() : null;

  return useQuery<boolean>({
    queryKey: ["isFollowing", targetStr],
    queryFn: async () => {
      if (!actor || !targetUser) return false;
      return actor.isFollowing(toPrincipal(targetUser));
    },
    enabled: !!actor && !!targetUser,
  });
}

export function useGetFollowerCount(targetUser: Principal | string | null) {
  const { actor } = useActor();
  const targetStr = targetUser ? toPrincipal(targetUser).toText() : null;

  return useQuery<bigint>({
    queryKey: ["followerCount", targetStr],
    queryFn: async () => {
      if (!actor || !targetUser) return BigInt(0);
      return actor.getFollowerCount(toPrincipal(targetUser));
    },
    enabled: !!actor && !!targetUser,
  });
}

export function useGetFollowingCount(targetUser: Principal | string | null) {
  const { actor } = useActor();
  const targetStr = targetUser ? toPrincipal(targetUser).toText() : null;

  return useQuery<bigint>({
    queryKey: ["followingCount", targetStr],
    queryFn: async () => {
      if (!actor || !targetUser) return BigInt(0);
      return actor.getFollowingCount(toPrincipal(targetUser));
    },
    enabled: !!actor && !!targetUser,
  });
}

// Block Hooks
export function useBlockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userToBlock: Principal | string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.blockUser(toPrincipal(userToBlock));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

export function useUnblockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userToUnblock: Principal | string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unblockUser(toPrincipal(userToUnblock));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

export function useGetBlockedUsers() {
  const { actor } = useActor();

  return useQuery<string[]>({
    queryKey: ["blockedUsers"],
    queryFn: async () => {
      if (!actor) return [];
      const blocked = await actor.getBlockedUsers();
      return blocked.map((p) => p.toString());
    },
    enabled: !!actor,
  });
}

export function useIsUserBlocked(user: Principal | string | null) {
  const { actor } = useActor();
  const userStr = user ? toPrincipal(user).toText() : null;

  return useQuery<boolean>({
    queryKey: ["isUserBlocked", userStr],
    queryFn: async () => {
      if (!actor || !user) return false;
      return actor.isUserBlocked(toPrincipal(user));
    },
    enabled: !!actor && !!user,
  });
}

// Post Hooks
export function useGetPosts() {
  const { actor } = useActor();

  return useQuery<Post[]>({
    queryKey: ["posts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPosts();
    },
    enabled: !!actor,
  });
}

export function useGetCallerPosts() {
  const { actor } = useActor();

  return useQuery<Post[]>({
    queryKey: ["callerPosts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCallerPosts();
    },
    enabled: !!actor,
  });
}

export function useGetUserPosts(userId: Principal | string | null) {
  const { actor } = useActor();
  const userIdStr = userId ? toPrincipal(userId).toText() : null;

  return useQuery<Post[]>({
    queryKey: ["userPosts", userIdStr],
    queryFn: async () => {
      if (!actor || !userId) return [];
      return actor.getUserPosts(toPrincipal(userId));
    },
    enabled: !!actor && !!userId,
  });
}

export function useGetPostsFromFollowedUsers() {
  const { actor } = useActor();

  return useQuery<Post[]>({
    queryKey: ["followedPosts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPostsFromFollowedUsers();
    },
    enabled: !!actor,
  });
}

export function useGetSavedPosts() {
  const { actor } = useActor();

  return useQuery<Post[]>({
    queryKey: ["savedPosts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSavedPosts();
    },
    enabled: !!actor,
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async ({
      content,
      image,
    }: { content: string; image: any | null }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.createPost(content, image);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["callerPosts"] });
    },
  });
}

export function useEditPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async ({
      postId,
      content,
      image,
    }: { postId: string; content: string; image: any | null }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.editPost(postId, content, image);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["callerPosts"] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["callerPosts"] });
      queryClient.invalidateQueries({ queryKey: ["pinnedTrendingPost"] });
    },
  });
}

export function useLikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.likePost(postId);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ["postInteractions", postId] });
    },
  });
}

export function useUnlikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unlikePost(postId);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ["postInteractions", postId] });
    },
  });
}

export function useCommentOnPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      comment,
      parentCommentId,
    }: {
      postId: string;
      comment: string;
      parentCommentId?: bigint | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.commentOnPost(postId, comment, parentCommentId ?? null);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["postComments", postId] });
      queryClient.invalidateQueries({ queryKey: ["postInteractions", postId] });
    },
  });
}

export function useDeleteComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      commentId,
    }: { postId: string; commentId: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteComment(postId, commentId);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["postComments", postId] });
      queryClient.invalidateQueries({ queryKey: ["postInteractions", postId] });
    },
  });
}

export function useGetPostComments(postId: string | null) {
  const { actor } = useActor();

  return useQuery<CommentInteraction[]>({
    queryKey: ["postComments", postId],
    queryFn: async () => {
      if (!actor || !postId) return [];
      return actor.getPostComments(postId);
    },
    enabled: !!actor && !!postId,
  });
}

export function useGetPostInteractions(postId: string | null) {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["postInteractions", postId],
    queryFn: async () => {
      if (!actor || !postId) return null;
      return actor.getPostInteractions(postId);
    },
    enabled: !!actor && !!postId,
  });
}

export function useSavePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.savePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedPosts"] });
    },
  });
}

export function useUnsavePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unsavePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedPosts"] });
    },
  });
}

export function useForwardPostToConversation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      conversationId,
    }: { postId: string; conversationId: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.forwardPostToConversation(postId, conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useGiftRosesOnPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      amount,
    }: { postId: string; amount: number }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.giftRosesOnPost(postId, amount);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["postInteractions", postId] });
      queryClient.invalidateQueries({ queryKey: ["roseBalance"] });
    },
  });
}

// Pinned Trending Post Hooks
export function useGetPinnedTrendingPost() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Post | null>({
    queryKey: ["pinnedTrendingPost"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPinnedTrendingPost();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function usePinPostToTrending() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.pinPostToTrending(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pinnedTrendingPost"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useUnpinTrendingPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.unpinTrendingPost();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pinnedTrendingPost"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

// Conversation Hooks
export function useGetConversations() {
  const { actor } = useActor();

  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getConversations();
    },
    enabled: !!actor,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async ({
      receiver,
      content,
    }: { receiver: Principal | string; content: any }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.sendMessage(toPrincipal(receiver), content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useLeaveConversation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.leaveConversation(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useEditMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId,
      newText,
    }: { conversationId: bigint; messageId: bigint; newText: string }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.editMessage(
        conversationId,
        messageId,
        newText,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId,
    }: { conversationId: bigint; messageId: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.deleteMessage(conversationId, messageId);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useForwardMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceConversationId,
      messageId,
      targetConversationId,
      targetGroupId,
    }: {
      sourceConversationId: bigint;
      messageId: bigint;
      targetConversationId?: bigint;
      targetGroupId?: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      if (targetConversationId !== undefined) {
        const result = await actor.forwardMessage(
          sourceConversationId,
          messageId,
          targetConversationId,
        );
        if (result.__kind__ === "err") throw new Error(result.err);
        return result.ok;
      }
      if (targetGroupId !== undefined) {
        const result = await actor.forwardMessageToGroup(
          sourceConversationId,
          messageId,
          targetGroupId,
        );
        if (result.__kind__ === "err") throw new Error(result.err);
        return result.ok;
      }
      throw new Error("Must specify targetConversationId or targetGroupId");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["groupMessages"] });
    },
  });
}

export function useEditGroupMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      messageId,
      newText,
    }: { groupId: bigint; messageId: bigint; newText: string }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.editGroupMessage(groupId, messageId, newText);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["groupMessages", groupId.toString()],
      });
    },
  });
}

export function useDeleteGroupMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      messageId,
    }: { groupId: bigint; messageId: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.deleteGroupMessage(groupId, messageId);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["groupMessages", groupId.toString()],
      });
    },
  });
}

export function useForwardGroupMessageToConversation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceGroupId,
      messageId,
      targetConversationId,
    }: {
      sourceGroupId: bigint;
      messageId: bigint;
      targetConversationId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.forwardGroupMessageToConversation(
        sourceGroupId,
        messageId,
        targetConversationId,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// Group Chat Hooks
export function useGetGroupChats() {
  const { actor } = useActor();

  return useQuery<GroupChat[]>({
    queryKey: ["groupChats"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getGroupChats();
    },
    enabled: !!actor,
  });
}

export function useGetGroupMessages(groupId: bigint | null) {
  const { actor } = useActor();

  return useQuery<GroupMessage[]>({
    queryKey: ["groupMessages", groupId?.toString()],
    queryFn: async () => {
      if (!actor || groupId === null) return [];
      return actor.getGroupMessages(groupId);
    },
    enabled: !!actor && groupId !== null,
  });
}

export function useGetGroupDetails(groupId: bigint | null) {
  const { actor } = useActor();

  return useQuery<GroupChat | null>({
    queryKey: ["groupDetails", groupId?.toString()],
    queryFn: async () => {
      if (!actor || groupId === null) return null;
      return actor.getGroupDetails(groupId);
    },
    enabled: !!actor && groupId !== null,
  });
}

export function useCreateGroupChat() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async ({
      name,
      participants,
      avatar,
    }: {
      name: string;
      participants: (Principal | string)[];
      avatar: any | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createGroupChat(name, participants.map(toPrincipal), avatar);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupChats"] });
    },
  });
}

export function useSendGroupMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async ({
      groupId,
      content,
    }: { groupId: bigint; content: any }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.sendGroupMessage(groupId, content);
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["groupMessages", groupId.toString()],
      });
    },
  });
}

export function useAddGroupParticipant() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      participant,
    }: { groupId: bigint; participant: Principal | string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.addGroupParticipant(groupId, toPrincipal(participant));
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["groupDetails", groupId.toString()],
      });
    },
  });
}

export function useRemoveGroupParticipant() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      participant,
    }: { groupId: bigint; participant: Principal | string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.removeGroupParticipant(groupId, toPrincipal(participant));
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["groupDetails", groupId.toString()],
      });
    },
  });
}

export function useLeaveGroup() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.leaveGroup(groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupChats"] });
    },
  });
}

export function useUpdateGroupName() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      newName,
    }: { groupId: bigint; newName: string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateGroupName(groupId, newName);
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["groupDetails", groupId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["groupChats"] });
    },
  });
}

export function useUpdateGroupAvatar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async ({
      groupId,
      avatar,
    }: { groupId: bigint; avatar: any | null }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateGroupAvatar(groupId, avatar);
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["groupDetails", groupId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["groupChats"] });
    },
  });
}

// Story Hooks
export function useGetActiveStories() {
  const { actor } = useActor();

  return useQuery<Story[]>({
    queryKey: ["activeStories"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveStories();
    },
    enabled: !!actor,
  });
}

export function useGetUserStories(userId: Principal | string | null) {
  const { actor } = useActor();
  const userIdStr = userId ? toPrincipal(userId).toText() : null;

  return useQuery<Story[]>({
    queryKey: ["userStories", userIdStr],
    queryFn: async () => {
      if (!actor || !userId) return [];
      return actor.getUserStories(toPrincipal(userId));
    },
    enabled: !!actor && !!userId,
  });
}

export function useCreateStory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (content: any) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createStory(content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeStories"] });
    },
  });
}

export function useMarkStoryAsViewed() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.markStoryAsViewed(storyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeStories"] });
    },
  });
}

export function usePinStory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.pinStory(storyId);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pinnedStories"] });
    },
  });
}

export function useUnpinStory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.unpinStory(storyId);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pinnedStories"] });
    },
  });
}

export function useGetPinnedStories(userId: Principal | string | null) {
  const { actor } = useActor();
  const userIdStr = userId ? toPrincipal(userId).toText() : null;

  return useQuery<Story[]>({
    queryKey: ["pinnedStories", userIdStr],
    queryFn: async () => {
      if (!actor || !userId) return [];
      return actor.getPinnedStories(toPrincipal(userId));
    },
    enabled: !!actor && !!userId,
  });
}

// Rose Currency Hooks
export function useGetRoseBalance() {
  const { actor } = useActor();

  return useQuery<number>({
    queryKey: ["roseBalance"],
    queryFn: async () => {
      if (!actor) return 0;
      return actor.getRoseBalance();
    },
    enabled: !!actor,
  });
}

export function useGetRoseSummary() {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["roseSummary"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getRoseSummary();
    },
    enabled: !!actor,
  });
}

export function useGetRoseTransactionHistory() {
  const { actor } = useActor();

  return useQuery<RoseTransaction[]>({
    queryKey: ["roseTransactions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRoseTransactionHistory();
    },
    enabled: !!actor,
  });
}

export function useGetUserRoseBalance(user: Principal | string | null) {
  const { actor } = useActor();
  const userStr = user ? toPrincipal(user).toText() : null;

  return useQuery<number>({
    queryKey: ["userRoseBalance", userStr],
    queryFn: async () => {
      if (!actor || !user) return 0;
      return actor.getUserRoseBalance(toPrincipal(user));
    },
    enabled: !!actor && !!user,
  });
}

export function useGiftRoses() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      receiver,
      amount,
    }: { receiver: Principal | string; amount: number }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.giftRoses(toPrincipal(receiver), amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roseBalance"] });
      queryClient.invalidateQueries({ queryKey: ["roseTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useRequestBuyRoses() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!actor) throw new Error("Actor not available");
      return actor.requestBuyRoses(amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roseBalance"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useRequestSellRoses() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!actor) throw new Error("Actor not available");
      return actor.requestSellRoses(amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roseBalance"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSellRosesToUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      buyer,
      amount,
    }: { buyer: Principal | string; amount: number }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.sellRosesToUser(toPrincipal(buyer), amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roseBalance"] });
      queryClient.invalidateQueries({ queryKey: ["roseTransactions"] });
    },
  });
}

export function useBuyRosesFromUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seller,
      amount,
    }: { seller: Principal | string; amount: number }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.buyRosesFromUser(toPrincipal(seller), amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roseBalance"] });
      queryClient.invalidateQueries({ queryKey: ["roseTransactions"] });
    },
  });
}

export function useClaimAllRoses() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.claimAllRoses();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roseBalance"] });
      queryClient.invalidateQueries({ queryKey: ["roseSummary"] });
    },
  });
}

// Exchange Rate Hook - as a query with a cached fallback value
export function useGetIcpUsdExchangeRate() {
  const { actor } = useActor();

  return useQuery<number>({
    queryKey: ["icpUsdExchangeRate"],
    queryFn: async () => {
      if (!actor) return 8.0;
      try {
        return await actor.getIcpUsdExchangeRate();
      } catch {
        return 8.0;
      }
    },
    enabled: !!actor,
    // Cache for 1 hour since the backend also caches it
    staleTime: 60 * 60 * 1000,
  });
}

// Analytics Hooks
export function useGetAnalyticsSummary() {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["analyticsSummary"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getAnalyticsSummary();
    },
    enabled: !!actor,
  });
}

export function useGetAllRoseTransactions() {
  const { actor } = useActor();

  return useQuery<RoseTransaction[]>({
    queryKey: ["allRoseTransactions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllRoseTransactions();
    },
    enabled: !!actor,
  });
}

export function useGetAllUserProfiles() {
  const { actor } = useActor();

  return useQuery<[Principal, UserProfile][]>({
    queryKey: ["allUserProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUserProfiles();
    },
    enabled: !!actor,
  });
}

// Notification Hooks
export function useGetNotifications() {
  const { actor } = useActor();

  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotifications();
    },
    enabled: !!actor,
    refetchInterval: 30000,
  });
}

export function useGetUnreadNotificationCount() {
  const { actor } = useActor();

  return useQuery<bigint>({
    queryKey: ["unreadNotificationCount"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getUnreadNotificationCount();
    },
    enabled: !!actor,
    refetchInterval: 15000,
  });
}

export function useGetNotificationCountByType() {
  const { actor } = useActor();

  return useQuery<NotificationCount | null>({
    queryKey: ["notificationCountByType"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getNotificationCountByType();
    },
    enabled: !!actor,
  });
}

export function useMarkNotificationAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.markNotificationAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.markAllNotificationsAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
  });
}

export function useDeleteNotification() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteNotification(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
  });
}

export function useClearAllNotifications() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.clearAllNotifications();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
  });
}

// Search Hooks
export function useUniversalSearch(searchTerm: string) {
  const { actor } = useActor();

  return useQuery<SearchResult[]>({
    queryKey: ["search", searchTerm],
    queryFn: async () => {
      if (!actor || !searchTerm) return [];
      return actor.universalSearch(searchTerm, null);
    },
    enabled: !!actor && searchTerm.length > 0,
  });
}

// Admin User Management Hooks
export function useAdminUpdateUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_args: {
      principal: Principal | string;
      profile: UserProfile;
    }) => {
      if (!actor) throw new Error("Actor not available");
      throw new Error(
        "Admin profile update not supported via current backend interface",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUserProfiles"] });
    },
  });
}

export function useAdminDeleteUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_principal: Principal | string) => {
      if (!actor) throw new Error("Actor not available");
      throw new Error(
        "Admin delete user not supported via current backend interface",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUserProfiles"] });
    },
  });
}
