declare module "react-native-tdlib" {
  // ==================== Input Types ====================

  export interface UserDetails {
    countrycode: string;
    phoneNumber: string;
  }

  export interface TdLibParameters {
    api_id: number;
    api_hash: string;
    system_language_code?: string;
    device_model?: string;
    system_version?: string;
    application_version?: string;
  }

  // ==================== Result Types ====================

  /**
   * Most high-level methods return a WritableMap with a "raw" field
   * containing the full JSON response from TDLib.
   */
  export interface TdRawResult {
    raw: string;
  }

  export interface TdChatMessagePositionResult extends TdRawResult {
    count?: number;
  }

  export interface TdCancelDownloadByRemoteIdResult extends TdRawResult {
    tdFileId?: number;
    remoteFileId?: string;
    error?: string;
    message?: string;
  }

  export interface TdCloseChatResult {
    success: boolean;
  }

  export interface TdChatHistoryItem {
    raw_json: string;
  }

  /**
   * TDLib update event emitted via NativeEventEmitter.
   * Listen with: eventEmitter.addListener('tdlib-update', callback)
   */
  export interface TdLibUpdateEvent {
    type: string;
    raw: string;
  }

  // ==================== Base API ====================

  export function td_json_client_create(): Promise<string>;
  export function td_json_client_send(request: Record<string, unknown>): Promise<string>;
  export function td_json_client_execute(request: Record<string, unknown>): Promise<string>;
  export function td_json_client_receive(): Promise<string>;

  // ==================== Options ====================

  export interface SetOptionValue {
    type: "string" | "integer" | "boolean" | "empty";
    value?: string | number | boolean;
  }

  /**
   * Get a TDLib option value by name.
   * Returns the value as a string, or null for empty options.
   */
  export function getOption(name: string): Promise<string | null>;

  /**
   * Set a TDLib option value.
   * @param name - Option name
   * @param value - Object with `type` and `value` fields
   */
  export function setOption(name: string, value: SetOptionValue): Promise<string>;

  /**
   * Search chats by query. Returns JSON array of chat objects.
   */
  export function searchChats(query: string, limit: number): Promise<string>;

  /**
   * Load chats from the server into TDLib's local cache.
   * Must be called before getChats to populate the chat list.
   */
  export function loadChats(limit: number): Promise<string>;

  /**
   * Get the list of chats. Returns JSON array of full chat objects.
   * Call loadChats first to ensure chats are loaded.
   */
  export function getChats(limit: number): Promise<string>;

  // ==================== Auth ====================

  export function startTdLib(parameters: TdLibParameters): Promise<string>;
  export function login(userDetails: UserDetails): Promise<string>;
  export function verifyPhoneNumber(otp: string): Promise<string>;
  export function verifyPassword(password: string): Promise<string>;
  export function getProfile(): Promise<string>;
  export function getAuthorizationState(): Promise<string>;
  export function logout(): Promise<string>;
  export function destroy(): Promise<string>;

  // ==================== Chat Operations ====================

  export function getChat(chatId: number): Promise<TdRawResult>;
  export function openChat(chatId: number): Promise<TdRawResult>;
  export function closeChat(chatId: number): Promise<TdCloseChatResult>;
  export function searchPublicChat(username: string): Promise<string>;
  export function joinChat(chatId: number): Promise<TdRawResult>;
  export function leaveChat(chatId: number): Promise<TdRawResult>;
  export function createPrivateChat(userId: number): Promise<string>;
  export function getChatMember(chatId: number, userId: number): Promise<TdRawResult>;
  export function getSupergroup(supergroupId: number): Promise<TdRawResult>;

  // ==================== Message Operations ====================

  export function getMessage(chatId: number, messageId: number): Promise<TdRawResult>;
  export function getChatHistory(
    chatId: number,
    fromMessageId: number,
    limit: number,
    offset: number,
  ): Promise<TdChatHistoryItem[]>;
  export function sendMessage(chatId: number, text: string): Promise<TdRawResult>;
  export function getMessagesCompat(chatId: number, messageIds: number[]): Promise<string>;
  export function viewMessages(
    chatId: number,
    messageIds: number[],
    forceRead: boolean,
  ): Promise<string>;
  export function getChatMessagePosition(
    chatId: number,
    messageId: number,
    threadId: number,
  ): Promise<TdChatMessagePositionResult>;
  export function getMessageThread(
    chatId: number,
    messageId: number,
  ): Promise<TdRawResult>;
  export function getMessageThreadHistory(
    chatId: number,
    messageThreadId: number,
    fromMessageId: number,
    offset: number,
    limit: number,
  ): Promise<TdRawResult>;

  // ==================== Comments ====================

  export function addComment(
    chatId: number,
    threadId: number,
    replyToMessageId: number,
    text: string,
  ): Promise<string>;
  export function deleteComment(chatId: number, messageId: number): Promise<boolean>;

  // ==================== Reactions ====================

  export function addMessageReaction(
    chatId: number,
    messageId: number,
    emoji: string,
  ): Promise<string>;
  export function removeMessageReaction(
    chatId: number,
    messageId: number,
    emoji: string,
  ): Promise<string>;
  export function getAddedReactions(
    chatId: number,
    messageId: number,
  ): Promise<TdRawResult>;

  // ==================== User Operations ====================

  export function getUserProfile(userId: number): Promise<string>;
  export function getUserFull(userId: number): Promise<string>;
  export function getUserProfilePhotos(
    userId: number,
    offset: number,
    limit: number,
  ): Promise<string>;
  export function getUsersCompat(userIds: number[]): Promise<string>;

  // ==================== File Operations ====================

  export function downloadFile(fileId: number): Promise<TdRawResult>;
  export function downloadFileByRemoteId(remoteId: string): Promise<TdRawResult>;
  export function cancelDownloadFile(
    fileId: number,
    onlyIfPending: boolean,
  ): Promise<TdRawResult>;
  export function cancelDownloadByRemoteId(
    remoteId: string,
    onlyIfPending: boolean,
  ): Promise<TdCancelDownloadByRemoteIdResult>;
  export function getFile(fileId: number): Promise<TdRawResult>;

  // ==================== Events & Utilities ====================

  export function echoToJs(message: Record<string, unknown>): void;
  export function addListener(eventName: string): void;
  export function removeListeners(count: number): void;

  // ==================== Default Export ====================

  const TdLib: {
    td_json_client_create: typeof td_json_client_create;
    td_json_client_execute: typeof td_json_client_execute;
    td_json_client_send: typeof td_json_client_send;
    td_json_client_receive: typeof td_json_client_receive;

    startTdLib: typeof startTdLib;
    login: typeof login;
    verifyPhoneNumber: typeof verifyPhoneNumber;
    verifyPassword: typeof verifyPassword;
    getProfile: typeof getProfile;
    getAuthorizationState: typeof getAuthorizationState;
    logout: typeof logout;
    destroy: typeof destroy;

    getChat: typeof getChat;
    openChat: typeof openChat;
    closeChat: typeof closeChat;
    searchPublicChat: typeof searchPublicChat;
    joinChat: typeof joinChat;
    leaveChat: typeof leaveChat;
    createPrivateChat: typeof createPrivateChat;
    getChatMember: typeof getChatMember;
    getSupergroup: typeof getSupergroup;

    getMessage: typeof getMessage;
    getChatHistory: typeof getChatHistory;
    sendMessage: typeof sendMessage;
    getMessagesCompat: typeof getMessagesCompat;
    viewMessages: typeof viewMessages;
    getChatMessagePosition: typeof getChatMessagePosition;
    getMessageThread: typeof getMessageThread;
    getMessageThreadHistory: typeof getMessageThreadHistory;

    addComment: typeof addComment;
    deleteComment: typeof deleteComment;

    addMessageReaction: typeof addMessageReaction;
    removeMessageReaction: typeof removeMessageReaction;
    getAddedReactions: typeof getAddedReactions;

    getUserProfile: typeof getUserProfile;
    getUserFull: typeof getUserFull;
    getUserProfilePhotos: typeof getUserProfilePhotos;
    getUsersCompat: typeof getUsersCompat;

    downloadFile: typeof downloadFile;
    downloadFileByRemoteId: typeof downloadFileByRemoteId;
    cancelDownloadFile: typeof cancelDownloadFile;
    cancelDownloadByRemoteId: typeof cancelDownloadByRemoteId;
    getFile: typeof getFile;

    getOption: typeof getOption;
    setOption: typeof setOption;
    searchChats: typeof searchChats;
    loadChats: typeof loadChats;
    getChats: typeof getChats;

    echoToJs: typeof echoToJs;
    addListener: typeof addListener;
    removeListeners: typeof removeListeners;
  };

  export default TdLib;
}
