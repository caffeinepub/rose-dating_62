import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type SearchResult = {
    __kind__: "postResult";
    postResult: {
        author: Principal;
        searchType: string;
        timestamp: Time;
        image?: ExternalBlob;
        contentSnippet: string;
        postId: string;
    };
} | {
    __kind__: "messageResult";
    messageResult: {
        messageId: bigint;
        senderProfile?: UserProfile;
        sender: Principal;
        searchType: string;
        conversationId: bigint;
        timestamp: Time;
        contentSnippet: string;
        receiver: Principal;
    };
} | {
    __kind__: "userResult";
    userResult: {
        principal: Principal;
        balance: number;
        searchType: string;
        profile: UserProfile;
    };
};
export interface ProfileWithPrincipal {
    principal: Principal;
    balance: number;
    profile: UserProfile;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface GroupMessage {
    id: bigint;
    content: MessageType;
    senderProfile?: UserProfile;
    sender: Principal;
    groupId: bigint;
    timestamp: Time;
}
export interface AnalyticsSummary {
    activeUsers: bigint;
    totalPlatformFees: number;
    totalRosesCirculating: number;
    totalRoseTransactions: bigint;
    totalMessages: bigint;
    totalUsers: bigint;
    totalRoseGifts: number;
    totalPosts: bigint;
}
export interface CommentInteraction {
    id: bigint;
    parentCommentId?: bigint;
    user: Principal;
    comment: string;
    timestamp: Time;
    postId: string;
}
export interface BlockRecord {
    blocked: Principal;
    blocker: Principal;
    timestamp: Time;
}
export interface RoseTransaction {
    id: bigint;
    feeDistributed: number;
    transactionType: RoseTransactionType;
    sender?: Principal;
    timestamp: Time;
    amount: number;
    receiver?: Principal;
}
export interface TradeRequestMessage {
    requester: Principal;
    summary: string;
    timestamp: Time;
    amount: number;
    requestType: string;
}
export interface GroupChat {
    id: bigint;
    creator: Principal;
    participants: Array<Principal>;
    name: string;
    createdAt: Time;
    admins: Array<Principal>;
    avatar?: ExternalBlob;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface Post {
    id: string;
    content: string;
    author: Principal;
    timestamp: Time;
    image?: ExternalBlob;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface Story {
    id: bigint;
    content: MessageType;
    expiresAt: Time;
    author: Principal;
    viewedBy: Array<Principal>;
    timestamp: Time;
}
export type MessageType = {
    __kind__: "media";
    media: ExternalBlob;
} | {
    __kind__: "tradeRequest";
    tradeRequest: TradeRequestMessage;
} | {
    __kind__: "receipt";
    receipt: ReceiptMessage;
} | {
    __kind__: "video";
    video: ExternalBlob;
} | {
    __kind__: "voice";
    voice: ExternalBlob;
} | {
    __kind__: "rose";
    rose: number;
} | {
    __kind__: "text";
    text: string;
} | {
    __kind__: "image";
    image: ExternalBlob;
} | {
    __kind__: "forwardedPost";
    forwardedPost: {
        author: Principal;
        timestamp: Time;
        image?: ExternalBlob;
        contentSnippet: string;
        postId: string;
    };
};
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ReceiptMessage {
    fee: number;
    sender: Principal;
    summary: string;
    timestamp: Time;
    amount: number;
    receiver: Principal;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface NotificationCount {
    groupAddCount: bigint;
    storyViewCount: bigint;
    likeCount: bigint;
    roseGiftCount: bigint;
    systemCount: bigint;
    totalCount: bigint;
    followCount: bigint;
    unreadCount: bigint;
    messageCount: bigint;
    roseReceiptCount: bigint;
    commentCount: bigint;
    tradeRequestCount: bigint;
    postGiftCount: bigint;
    groupMessageCount: bigint;
}
export interface Notification {
    id: bigint;
    linkedId?: string;
    content: string;
    userId: Principal;
    notificationType: NotificationType;
    isRead: boolean;
    timestamp: Time;
    linkedType?: string;
}
export interface Message {
    id: bigint;
    content: MessageType;
    senderProfile?: UserProfile;
    sender: Principal;
    timestamp: Time;
    receiver: Principal;
}
export interface ProfileFilter {
    country?: string;
    minAge?: bigint;
    gender?: string;
    maxAge?: bigint;
    minBalance?: number;
}
export interface Conversation {
    id: bigint;
    participants: Array<Principal>;
    messages: Array<Message>;
    otherParticipantProfile?: UserProfile;
}
export interface UserProfile {
    bio?: string;
    country: string;
    username: string;
    birthYear?: bigint;
    name: string;
    gender?: string;
    profilePicture?: ExternalBlob;
}
export enum NotificationType {
    postGift = "postGift",
    groupMessage = "groupMessage",
    roseReceipt = "roseReceipt",
    tradeRequest = "tradeRequest",
    systemNotice = "systemNotice",
    storyView = "storyView",
    like = "like",
    comment = "comment",
    groupAdd = "groupAdd",
    message = "message",
    roseGift = "roseGift",
    follow = "follow"
}
export enum RoseTransactionType {
    buy = "buy",
    fee = "fee",
    gift = "gift",
    mint = "mint",
    sell = "sell",
    transfer = "transfer"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addGroupParticipant(groupId: bigint, newParticipant: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(userToBlock: Principal): Promise<void>;
    buyRosesFromUser(seller: Principal, amount: number): Promise<void>;
    claimAllRoses(): Promise<void>;
    cleanupExpiredStories(): Promise<bigint>;
    clearAllNotifications(): Promise<void>;
    commentOnPost(postId: string, comment: string, parentCommentId: bigint | null): Promise<void>;
    convertBalanceToUsd(amount: number): Promise<number>;
    convertBalanceToUsdQuery(amount: number): Promise<number>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createGroupChat(name: string, initialParticipants: Array<Principal>, avatar: ExternalBlob | null): Promise<bigint>;
    createPost(content: string, image: ExternalBlob | null): Promise<void>;
    createStory(content: MessageType): Promise<bigint>;
    deleteCallerProfile(): Promise<void>;
    deleteComment(postId: string, commentId: bigint): Promise<void>;
    deleteMessage(conversationId: bigint, messageId: bigint): Promise<void>;
    deleteNotification(notificationId: bigint): Promise<void>;
    deletePost(postId: string): Promise<void>;
    editMessage(conversationId: bigint, messageId: bigint, newContent: MessageType): Promise<void>;
    editPost(postId: string, content: string, image: ExternalBlob | null): Promise<void>;
    filterProfiles(filter: ProfileFilter): Promise<Array<ProfileWithPrincipal>>;
    followUser(targetUser: Principal): Promise<void>;
    forwardPostToConversation(postId: string, conversationId: bigint): Promise<void>;
    getActiveStories(): Promise<Array<Story>>;
    getAllBlockRecords(): Promise<Array<BlockRecord>>;
    getAllRoseTransactions(): Promise<Array<RoseTransaction>>;
    getAllUserProfiles(): Promise<Array<[Principal, UserProfile]>>;
    getAnalyticsSummary(): Promise<AnalyticsSummary>;
    getBlockedUsers(): Promise<Array<Principal>>;
    getCallerPosts(): Promise<Array<Post>>;
    getCallerUserProfile(): Promise<UserProfile>;
    getCallerUserRole(): Promise<UserRole>;
    getConversations(): Promise<Array<Conversation>>;
    getFollowerCount(targetUser: Principal): Promise<bigint>;
    getFollowingCount(targetUser: Principal): Promise<bigint>;
    getGroupChats(): Promise<Array<GroupChat>>;
    getGroupDetails(groupId: bigint): Promise<GroupChat>;
    getGroupMessages(groupId: bigint): Promise<Array<GroupMessage>>;
    getIcpUsdExchangeRate(): Promise<number>;
    getNotificationCountByType(): Promise<NotificationCount>;
    getNotifications(): Promise<Array<Notification>>;
    getPinnedTrendingPost(): Promise<Post | null>;
    getPostComments(postId: string): Promise<Array<CommentInteraction>>;
    getPostInteractions(postId: string): Promise<{
        totalRosesGifted: number;
        forwards: bigint;
        likes: bigint;
        saves: bigint;
        comments: bigint;
        roseGifts: bigint;
    }>;
    getPosts(): Promise<Array<Post>>;
    getPostsFromFollowedUsers(): Promise<Array<Post>>;
    getRoseBalance(): Promise<number>;
    getRoseSummary(): Promise<{
        totalCirculating: number;
        feeRewards: number;
        userBalance: number;
    }>;
    getRoseTransactionHistory(): Promise<Array<RoseTransaction>>;
    getSavedPosts(): Promise<Array<Post>>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getTotalCirculatingRoses(): Promise<number>;
    getUnreadNotificationCount(): Promise<bigint>;
    getUserPosts(userId: Principal): Promise<Array<Post>>;
    getUserProfile(arg0: {
        profileId: Principal;
    }): Promise<UserProfile>;
    getUserRoseBalance(user: Principal): Promise<number>;
    getUserStories(userId: Principal): Promise<Array<Story>>;
    giftRoses(receiver: Principal, amount: number): Promise<void>;
    giftRosesOnPost(postId: string, amount: number): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(targetUser: Principal): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    isUserBlocked(user: Principal): Promise<boolean>;
    leaveConversation(conversationId: bigint): Promise<void>;
    leaveGroup(groupId: bigint): Promise<void>;
    likePost(postId: string): Promise<void>;
    markAllNotificationsAsRead(): Promise<void>;
    markNotificationAsRead(notificationId: bigint): Promise<void>;
    markStoryAsViewed(storyId: bigint): Promise<void>;
    pinPostToTrending(postId: string): Promise<void>;
    removeGroupParticipant(groupId: bigint, participant: Principal): Promise<void>;
    requestBuyRoses(amount: number): Promise<string>;
    requestSellRoses(amount: number): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    savePost(postId: string): Promise<void>;
    sellRosesToUser(buyer: Principal, amount: number): Promise<void>;
    sendGroupMessage(groupId: bigint, content: MessageType): Promise<void>;
    sendMessage(receiver: Principal, content: MessageType): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    unblockUser(userToUnblock: Principal): Promise<void>;
    unfollowUser(targetUser: Principal): Promise<void>;
    universalSearch(searchTerm: string, maxResults: bigint | null): Promise<Array<SearchResult>>;
    unlikePost(postId: string): Promise<void>;
    unpinTrendingPost(): Promise<void>;
    unsavePost(postId: string): Promise<void>;
    updateGroupAvatar(groupId: bigint, newAvatar: ExternalBlob | null): Promise<void>;
    updateGroupName(groupId: bigint, newName: string): Promise<void>;
}
