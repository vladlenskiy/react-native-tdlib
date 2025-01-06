declare module "react-native-tdlib" {
  export interface UserDetails {
    countrycode: string; // Country code, e.g., "+1"
    phoneNumber: string; // Phone number, e.g., "1234567890"
  }

  /**
   * Creates a new TDLib client instance.
   * @returns Promise that resolves to a string indicating the client was created.
   */
  export function td_json_client_create(): Promise<string>;

  /**
   * Sends a request to the TDLib client asynchronously.
   * @param request The request object in JSON format.
   * @returns Promise that resolves when the request is sent successfully.
   */
  export function td_json_client_send(request: object): Promise<string>;

  /**
   * Executes a request synchronously and returns a response.
   * @param request The request object in JSON format.
   * @returns Promise that resolves to the response from TDLib.
   */
  export function td_json_client_execute(request: object): Promise<string>;

  /**
   * Waits for a response from TDLib with a timeout.
   * @returns Promise that resolves to the received response or an error if no response.
   */
  export function td_json_client_receive(): Promise<string>;

  /**
   * Starts the TDLib service and initializes it with the provided parameters.
   *
   * @param parameters An object containing TDLib configuration parameters, such as `api_id`, `api_hash`, `database_directory`, etc.
   * @returns A promise that resolves when TDLib is successfully started.
   * @throws An error if starting TDLib or setting parameters fails.
   */
  export function startTdLib(parameters: {
    api_id: number;
    api_hash: string;
    system_language_code?: string;
    device_model?: string;
    system_version?: string;
    application_version?: string;
  }): Promise<string>;

  /**
   * Logs in the user using their phone number.
   *
   * @param userDetails An object containing the country code and phone number.
   * @returns A promise that resolves when the phone number is successfully submitted.
   * @throws An error if the login process fails.
   */
  export function login(userDetails: UserDetails): Promise<void>;

  /**
   * Verifies the confirmation code.
   *
   * @param otp The confirmation code (one-time password).
   * @returns A promise that resolves when the code is successfully verified.
   * @throws An error if the code is incorrect or the verification process fails.
   */
  export function verifyPhoneNumber(otp: string): Promise<void>;

  /**
   * Verifies the user's password for two-factor authentication.
   * This method should be called after receiving the `AuthorizationStateWaitPassword` state.
   *
   * @param password The password set by the user for two-factor authentication.
   * @returns A promise that resolves when the password is successfully verified.
   *          The resolved value is a string indicating success.
   *          If the password is incorrect or there is another error, the promise is rejected with an error message.
   */
  export function verifyPassword(password: string): Promise<string>;

  /**
   * Fetches the current user's profile information.
   *
   * @returns A promise that resolves with the profile details.
   * @throws An error if fetching the profile fails.
   */
  export function getProfile(): Promise<any>;

  /**
   * Fetches the current authorization state.
   *
   * @returns A promise that resolves with the current authorization state.
   * @throws An error if fetching the authorization state fails.
   */
  export function getAuthorizationState(): Promise<any>;

  /**
   * General export object for the library's functions.
   */
  export function logout(): Promise<any>;

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
  };

  export default TdLib;
}
