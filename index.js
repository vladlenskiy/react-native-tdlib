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
  td_json_client_send_raw: TdLibModule.td_json_client_send_raw,
  td_json_client_receive: TdLibModule.td_json_client_receive,
  // High-Level API
  startTdLib: TdLibModule.startTdLib,
  login: TdLibModule.login,
  verifyPhoneNumber: TdLibModule.verifyPhoneNumber,
  verifyPassword: TdLibModule.verifyPassword,
  getProfile: TdLibModule.getProfile,
  getAuthorizationState: TdLibModule.getAuthorizationState,
  logout: TdLibModule.logout,
};
