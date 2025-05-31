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

  /**
 * Fetch chat history messages.
 */
  export function getChatHistory(
    chatId: number | string,
    fromMessageId: number,
    limit: number
  ): Promise<
    {
      id: number;
      chat_id: number;
      date: number;
      sender_id: number;
      text: string;
    }[]
  >;


  // پیام از نوع متنی
  export interface TdMessage {
    id: number;
    chat_id: number;
    date: number;
    sender_id: number;
    text: string;
  }

  // اطلاعات چت
  export interface TdChat {
    id: string;
    title: string;
    type: string;
  }

  // Base API
  export function td_json_client_create(): Promise<string>;
  export function td_json_client_send(request: object): Promise<string>;
  export function td_json_client_execute(request: object): Promise<string>;
  export function td_json_client_receive(): Promise<string>;

  // High-Level API
  export function startTdLib(parameters: TdLibParameters): Promise<string>;
  export function login(userDetails: UserDetails): Promise<void>;
  export function verifyPhoneNumber(otp: string): Promise<void>;
  export function verifyPassword(password: string): Promise<string>;
  export function getProfile(): Promise<any>;
  export function getAuthorizationState(): Promise<any>;
  export function logout(): Promise<any>;

  export function getChat(chatId: string | number): Promise<TdChat>;

  /**
   * Gets a specific message from a chat.
   * @param chatId Chat ID
   * @param messageId Message ID
   */
  export function getMessage(chatId: number, messageId: number): Promise<TdMessage>;

  /**
   * Retrieves the chat history.
   * @param chatId ID of the chat
   * @param fromMessageId ID to start fetching from (use 0 for latest)
   * @param limit Number of messages to fetch
   */
  export function getChatHistory(
    chatId: number,
    fromMessageId: number,
    limit: number
  ): Promise<TdMessage[]>;

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
    getChat: typeof getChat;

    // New Methods
    getMessage: typeof getMessage;
    getChatHistory: typeof getChatHistory;
  };

  export default TdLib;
}
