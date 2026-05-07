import { NativeModules } from "react-native";

const { TdLibModule } = NativeModules;

if (!TdLibModule) {
  throw new Error(
    "TdLibModule not linked. Make sure the library is properly installed.",
  );
}

export default {
  // Base API
  td_json_client_create: TdLibModule.td_json_client_create,
  td_json_client_execute: TdLibModule.td_json_client_execute,
  td_json_client_send: TdLibModule.td_json_client_send,
  td_json_client_receive: TdLibModule.td_json_client_receive,

  // Auth
  startTdLib: TdLibModule.startTdLib,
  login: TdLibModule.login,
  verifyPhoneNumber: TdLibModule.verifyPhoneNumber,
  verifyPassword: TdLibModule.verifyPassword,
  getProfile: TdLibModule.getProfile,
  getAuthorizationState: TdLibModule.getAuthorizationState,
  logout: TdLibModule.logout,
  destroy: TdLibModule.destroy,

  // Chat Operations
  getChat: TdLibModule.getChat,
  openChat: TdLibModule.openChat,
  closeChat: TdLibModule.closeChat,
  searchPublicChat: TdLibModule.searchPublicChat,
  searchChats: TdLibModule.searchChats,
  joinChat: TdLibModule.joinChat,
  leaveChat: TdLibModule.leaveChat,
  createPrivateChat: TdLibModule.createPrivateChat,
  getChatMember: TdLibModule.getChatMember,
  getSupergroup: TdLibModule.getSupergroup,
  loadChats: TdLibModule.loadChats,
  getChats: TdLibModule.getChats,

  // Message Operations
  getMessage: TdLibModule.getMessage,
  getChatHistory: TdLibModule.getChatHistory,
  sendMessage: (chatId, text, replyToMessageId) =>
    TdLibModule.sendMessage(chatId, text, replyToMessageId ?? 0),
  getMessagesCompat: TdLibModule.getMessagesCompat,
  viewMessages: TdLibModule.viewMessages,
  getChatMessagePosition: TdLibModule.getChatMessagePosition,
  getMessageThread: TdLibModule.getMessageThread,
  getMessageThreadHistory: TdLibModule.getMessageThreadHistory,
  deleteMessages: (chatId, messageIds, revoke = true) =>
    TdLibModule.deleteMessages(chatId, messageIds, revoke),

  // Comments
  addComment: TdLibModule.addComment,
  deleteComment: TdLibModule.deleteComment,

  // Reactions
  addMessageReaction: TdLibModule.addMessageReaction,
  removeMessageReaction: TdLibModule.removeMessageReaction,
  getAddedReactions: TdLibModule.getAddedReactions,

  // User Operations
  getUserProfile: TdLibModule.getUserProfile,
  getUserFull: TdLibModule.getUserFull,
  getUserProfilePhotos: TdLibModule.getUserProfilePhotos,
  getUsersCompat: TdLibModule.getUsersCompat,

  // File Operations
  downloadFile: TdLibModule.downloadFile,
  downloadFileByRemoteId: TdLibModule.downloadFileByRemoteId,
  cancelDownloadFile: TdLibModule.cancelDownloadFile,
  cancelDownloadByRemoteId: TdLibModule.cancelDownloadByRemoteId,
  getFile: TdLibModule.getFile,

  // Options
  getOption: TdLibModule.getOption,
  setOption: TdLibModule.setOption,

  // Events & Utilities
  echoToJs: TdLibModule.echoToJs,
  addListener: TdLibModule.addListener,
  removeListeners: TdLibModule.removeListeners,
};
