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
  // High-Level API
  startTdLib: TdLibModule.startTdLib,
  login: TdLibModule.login,
  verifyPhoneNumber: TdLibModule.verifyPhoneNumber,
  verifyPassword: TdLibModule.verifyPassword,
  getProfile: TdLibModule.getProfile,
  getChat: TdLibModule.getChat,
  getMessage: TdLibModule.getMessage,
  getChatHistory: TdLibModule.getChatHistory,
  downloadFile: TdLibModule.downloadFile,
  cancelDownloadFile: TdLibModule.cancelDownloadFile,
  sendMessage: TdLibModule.sendMessage,
  getMessageThreadHistory: TdLibModule.getMessageThreadHistory,
  getMessageThread: TdLibModule.getMessageThread,
  getUserProfilePhotos: TdLibModule.getUserProfilePhotos,
  getSupergroup: TdLibModule.getSupergroup,
  getUsersCompat: TdLibModule.getUsersCompat,
  searchPublicChat: TdLibModule.searchPublicChat,
  getMessagesCompat: TdLibModule.getMessagesCompat,
  openChat: TdLibModule.openChat,
  closeChat: TdLibModule.closeChat,
  createPrivateChat: TdLibModule.createPrivateChat,
  addComment: TdLibModule.addComment,
  getChatMember: TdLibModule.getChatMember,
  leaveChat: TdLibModule.leaveChat,
  joinChat: TdLibModule.joinChat,
  getUserProfile: TdLibModule.getUserProfile,
  getChatMessagePosition: TdLibModule.getChatMessagePosition,
  removeMessageReaction: TdLibModule.removeMessageReaction,
  addMessageReaction: TdLibModule.addMessageReaction,
  getAddedReactions: TdLibModule.getAddedReactions,
  viewMessages: TdLibModule.viewMessages,
  echoToJs: TdLibModule.echoToJs,
  getAuthorizationState: TdLibModule.getAuthorizationState,
  logout: TdLibModule.logout,
  getFile: TdLibModule.getFile,
  downloadFileByRemoteId: TdLibModule.downloadFileByRemoteId,
  cancelDownloadByRemoteId: TdLibModule.cancelDownloadByRemoteId,
  deleteComment: TdLibModule.deleteComment,
  getUserFull: TdLibModule.getUserFull,
  destroy: TdLibModule.destroy,
};
