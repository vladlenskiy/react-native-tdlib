declare module "react-native-tdlib" {
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

  export interface TdMessage {
    id: number;
    chat_id: number;
    date: number;
    sender_id: number;
    text: string;
  }

  export interface TdChat {
    id: string;
    title: string;
    type: string;
  }

  export interface TdFile {
    id: number;
    path: string;
    isDownloadingCompleted: boolean;
  }

  export interface SendMessageOptions {
    chatId: number;
    text: string;
    replyToMessageId?: number;
  }

  /**
   * Base API
   */
  export function td_json_client_create(): Promise<string>;
  export function td_json_client_send(request: object): Promise<string>;
  export function td_json_client_execute(request: object): Promise<string>;
  export function td_json_client_receive(): Promise<string>;

  /**
   * High-Level API
   */
  export function startTdLib(parameters: TdLibParameters): Promise<string>;
  export function login(userDetails: UserDetails): Promise<void>;
  export function verifyPhoneNumber(otp: string): Promise<void>;
  export function verifyPassword(password: string): Promise<string>;
  export function getProfile(): Promise<any>;
  export function getAuthorizationState(): Promise<any>;
  export function logout(): Promise<any>;

  /**
   * Chat & Message Methods
   */
  export function getChat(chatId: string | number): Promise<TdChat>;

  export function getMessage(
    chatId: number,
    messageId: number
  ): Promise<TdMessage>;

  export function getChatHistory(
    chatId: number,
    fromMessageId: number,
    limit: number
  ): Promise<TdMessage[]>;

  export function sendMessage(options: SendMessageOptions): Promise<TdMessage>;

  export function downloadFile(
    fileId: number,
    priority?: number,
    synchronous?: boolean
  ): Promise<TdFile>;

  const TdLib: {
    // Base API
    td_json_client_create: typeof td_json_client_create;
    td_json_client_execute: typeof td_json_client_execute;
    td_json_client_send: typeof td_json_client_send;
    td_json_client_receive: typeof td_json_client_receive;

    // High-Level API
    startTdLib: typeof startTdLib;
    login: typeof login;
    verifyPhoneNumber: typeof verifyPhoneNumber;
    verifyPassword: typeof verifyPassword;
    getProfile: typeof getProfile;
    getAuthorizationState: typeof getAuthorizationState;
    logout: typeof logout;

    // Message/Chat API
    getChat: typeof getChat;
    getMessage: typeof getMessage;
    getChatHistory: typeof getChatHistory;
    sendMessage: typeof sendMessage;
    downloadFile: typeof downloadFile;
  };

  export default TdLib;
}
