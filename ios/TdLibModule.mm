#import "TdLibModule.h"
#include "td/telegram/td_json_client.h"
#import <React/RCTBridge.h>
#import <React/RCTLog.h>

@implementation TdLibModule {
    void *_client;
}

RCT_EXPORT_MODULE();

// ==================== Base API Methods ====================

RCT_EXPORT_METHOD(td_json_client_create:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        _client = td_json_client_create();
        resolve(@"TDLib client created");
    } @catch (NSException *exception) {
        reject(@"CREATE_CLIENT_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(td_json_client_execute:(NSDictionary *)request
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_client == NULL) {
            reject(@"CLIENT_NOT_INITIALIZED", @"TDLib client is not initialized", nil);
            return;
        }

        NSError *error = nil;
        NSData *requestData = [NSJSONSerialization dataWithJSONObject:request options:0 error:&error];
        if (error) {
            reject(@"JSON_SERIALIZATION_ERROR", error.localizedDescription, nil);
            return;
        }

        NSString *requestString = [[NSString alloc] initWithData:requestData encoding:NSUTF8StringEncoding];
        const char *response = td_json_client_execute(_client, [requestString UTF8String]);

        if (response != NULL) {
            NSString *responseString = [NSString stringWithUTF8String:response];
            resolve(responseString);
        } else {
            reject(@"EXECUTE_ERROR", @"No response from TDLib", nil);
        }
    } @catch (NSException *exception) {
        reject(@"EXECUTE_EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(td_json_client_send:(NSDictionary *)request
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_client == NULL) {
            reject(@"CLIENT_NOT_INITIALIZED", @"TDLib client is not initialized", nil);
            return;
        }

        NSString *requestJSON;

        if ([request[@"@type"] isEqualToString:@"setTdlibParameters"]) {
            if (![self handleTdLibParameters:request[@"parameters"]]) {
                reject(@"TDLIB_PARAMS_ERROR", @"Failed to set TDLib parameters", nil);
                return;
            }
            resolve(@"TDLib parameters set successfully");
            return;
        } else {
            NSError *error = nil;
            NSData *jsonData = [NSJSONSerialization dataWithJSONObject:request options:0 error:&error];
            if (error) {
                reject(@"JSON_SERIALIZATION_ERROR", error.localizedDescription, nil);
                return;
            }
            requestJSON = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
        }

        NSLog(@"TDLib Request: %@", requestJSON);
        td_json_client_send(_client, [requestJSON UTF8String]);
        resolve(@"Request sent successfully");
    } @catch (NSException *exception) {
        reject(@"SEND_EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(td_json_client_receive:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    if (_client == NULL) {
        reject(@"CLIENT_NOT_INITIALIZED", @"TDLib client not initialized", nil);
        return;
    }

    const char *response = td_json_client_receive(_client, 10.0);
    if (response) {
        NSString *responseString = [NSString stringWithUTF8String:response];
        resolve(responseString);
    } else {
        reject(@"RECEIVE_ERROR", @"No response from TDLib", nil);
    }
}

// ==================== High-Level API Methods ====================

RCT_EXPORT_METHOD(logout:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_client == NULL) {
            reject(@"TDLIB_NOT_STARTED", @"TDLib client is not initialized. Call startTdLibService first.", nil);
            return;
        }

        // Создаем запрос на выход из аккаунта
        NSString *request = @"{\"@type\":\"logOut\"}";
        td_json_client_send(_client, [request UTF8String]);
        NSLog(@"Logout request sent: %@", request);

        // Ожидаем ответа от TDLib
        while (true) {
            const char *response = td_json_client_receive(_client, 10.0);
            if (response != NULL) {
                NSString *responseString = [NSString stringWithUTF8String:response];
                NSLog(@"Logout response received: %@", responseString);

                NSDictionary *responseDict = [NSJSONSerialization JSONObjectWithData:[responseString dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
                NSString *type = responseDict[@"@type"];

                if ([type isEqualToString:@"ok"]) {
                    resolve(@"Logout successful");
                    return;
                }

                if ([type isEqualToString:@"error"]) {
                    reject(@"LOGOUT_ERROR", responseString, nil);
                    return;
                }

                if ([type containsString:@"update"]) {
                    NSLog(@"Ignoring update: %@", type);
                    continue;
                }
            } else {
                reject(@"NO_RESPONSE", @"No response from TDLib during logout", nil);
                return;
            }
        }
    } @catch (NSException *exception) {
        reject(@"LOGOUT_EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getAuthorizationState:(RCTPromiseResolveBlock)resolve
                              rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_client == NULL) {
            reject(@"TDLIB_NOT_STARTED", @"TDLib client is not initialized. Call startTdLibService first.", nil);
            return;
        }

        NSString *request = @"{\"@type\":\"getAuthorizationState\"}";
        td_json_client_send(_client, [request UTF8String]);

        while (true) {
            const char *response = td_json_client_receive(_client, 10.0);
            if (response != NULL) {
                NSString *responseString = [NSString stringWithUTF8String:response];
                NSLog(@"TDLib response: %@", responseString);

                NSDictionary *responseDict = [NSJSONSerialization JSONObjectWithData:[responseString dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
                NSString *type = responseDict[@"@type"];

                if ([type isEqualToString:@"authorizationStateWaitPhoneNumber"] ||
                    [type isEqualToString:@"authorizationStateWaitCode"] ||
                    [type isEqualToString:@"authorizationStateReady"] ||
                    [type isEqualToString:@"authorizationStateWaitOtherDeviceConfirmation"] ||
                    [type isEqualToString:@"authorizationStateClosed"]) {
                    resolve(responseString);
                    return;
                }

                if ([type containsString:@"update"]) {
                    NSLog(@"Ignoring update: %@", type);
                    continue;
                }
            } else {
                reject(@"NO_RESPONSE", @"No response from TDLib", nil);
                return;
            }
        }
    } @catch (NSException *exception) {
        reject(@"GET_AUTH_STATE_EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(verifyPassword:(NSString *)password
                  promise:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_client == NULL) {
            reject(@"TDLIB_NOT_STARTED", @"TDLib client is not initialized. Call startTdLibService first.", nil);
            return;
        }

        NSString *request = [NSString stringWithFormat:@"{\"@type\":\"checkAuthenticationPassword\",\"password\":\"%@\"}", password];
        td_json_client_send(_client, [request UTF8String]);

        const char *response = td_json_client_receive(_client, 10.0);
        if (response != NULL) {
            NSString *responseString = [NSString stringWithUTF8String:response];
            if ([responseString containsString:@"\"@type\":\"error\""]) {
                reject(@"PASSWORD_ERROR", responseString, nil);
                return;
            }
        }

        resolve(@"Password verification successful");
    } @catch (NSException *exception) {
        reject(@"PASSWORD_EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(login:(NSDictionary *)userDetails
                  promise:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_client == NULL) {
            reject(@"TDLIB_NOT_STARTED", @"TDLib client is not initialized. Call startTdLibService first.", nil);
            return;
        }

        NSString *countryCode = userDetails[@"countrycode"];
        NSString *phoneNumber = userDetails[@"phoneNumber"];
        if (!countryCode || !phoneNumber) {
            reject(@"INVALID_INPUT", @"Both countrycode and phoneNumber must be provided", nil);
            return;
        }

        NSString *fullPhoneNumber = [NSString stringWithFormat:@"%@%@", countryCode, phoneNumber];
        NSLog(@"Full phone number: %@", fullPhoneNumber);

        NSString *request = [NSString stringWithFormat:
                             @"{"
                             "\"@type\":\"setAuthenticationPhoneNumber\","
                             "\"phone_number\":\"%@\","
                             "\"settings\":{"
                             "\"@type\":\"phoneNumberAuthenticationSettings\","
                             "\"allow_flash_call\":false,"
                             "\"allow_missed_call\":false,"
                             "\"is_current_phone_number\":true,"
                             "\"allow_sms_retriever_api\":true"
                             "}"
                             "}", fullPhoneNumber];
        td_json_client_send(_client, [request UTF8String]);
        NSLog(@"Login request sent: %@", request);

        const char *response = td_json_client_receive(_client, 10.0);
        if (response != NULL) {
            NSString *responseString = [NSString stringWithUTF8String:response];
            NSLog(@"Login response received: %@", responseString);

            if ([responseString containsString:@"\"@type\":\"error\""]) {
                NSLog(@"Login error: %@", responseString);
                reject(@"LOGIN_ERROR", responseString, nil);
                return;
            }
        } else {
            reject(@"NO_RESPONSE", @"No response from TDLib", nil);
            return;
        }

        resolve(@"Phone number set successfully");
    } @catch (NSException *exception) {
        NSLog(@"Exception in login: %@", exception.reason);
        reject(@"LOGIN_EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(verifyPhoneNumber:(NSString *)otp
                  promise:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_client == NULL) {
            reject(@"TDLIB_NOT_STARTED", @"TDLib client is not initialized. Call startTdLibService first.", nil);
            return;
        }

        NSString *request = [NSString stringWithFormat:@"{\"@type\":\"checkAuthenticationCode\",\"code\":\"%@\"}", otp];
        td_json_client_send(_client, [request UTF8String]);

        while (true) {
            const char *response = td_json_client_receive(_client, 10.0);
            if (response != NULL) {
                NSString *responseString = [NSString stringWithUTF8String:response];
                NSLog(@"VerifyPhoneNumber response: %@", responseString);

                NSDictionary *responseDict = [NSJSONSerialization JSONObjectWithData:[responseString dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
                NSString *type = responseDict[@"@type"];

                if ([type isEqualToString:@"ok"]) {
                    resolve(@"Verification successful");
                    return;
                }

                if ([type isEqualToString:@"error"]) {
                    reject(@"VERIFY_PHONE_NUMBER_ERROR", responseString, nil);
                    return;
                }

                if ([type containsString:@"update"]) {
                    NSLog(@"Ignoring update: %@", type);
                    continue;
                }
            } else {
                reject(@"NO_RESPONSE", @"No response from TDLib", nil);
                return;
            }
        }
    } @catch (NSException *exception) {
        reject(@"VERIFY_PHONE_NUMBER_EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getProfile:(RCTPromiseResolveBlock)resolve
                          rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_client == NULL) {
            reject(@"TDLIB_NOT_STARTED", @"TDLib client is not initialized. Call startTdLib first.", nil);
            return;
        }

        NSString *request = @"{\"@type\":\"getMe\"}";
        td_json_client_send(_client, [request UTF8String]);

        while (true) {
            const char *response = td_json_client_receive(_client, 10.0);
            if (response != NULL) {
                NSString *responseString = [NSString stringWithUTF8String:response];
                NSLog(@"getProfile response: %@", responseString);

                NSDictionary *responseDict = [NSJSONSerialization JSONObjectWithData:[responseString dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
                NSString *type = responseDict[@"@type"];

                if ([type isEqualToString:@"user"]) {
                    resolve(responseDict);
                    return;
                }

                if ([type isEqualToString:@"error"]) {
                    reject(@"GET_PROFILE_ERROR", responseString, nil);
                    return;
                }

                if ([type containsString:@"update"]) {
                    NSLog(@"Ignoring update: %@", type);
                    continue;
                }
            } else {
                reject(@"NO_RESPONSE", @"No response from TDLib while getting profile", nil);
                return;
            }
        }
    } @catch (NSException *exception) {
        reject(@"GET_PROFILE_EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(startTdLib:(NSDictionary *)parameters
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_client != NULL) {
            resolve(@"TDLib already started");
            return;
        }

        _client = td_json_client_create();

        td_json_client_send(_client, "{\"@type\":\"setLogVerbosityLevel\",\"new_verbosity_level\":0}");

        if (![self handleTdLibParameters:parameters]) {
            reject(@"TDLIB_PARAMS_ERROR", @"Failed to set TDLib parameters", nil);
            return;
        }

        resolve(@"TDLib service started successfully");
    } @catch (NSException *exception) {
        reject(@"TDLIB_START_ERROR", exception.reason, nil);
    }
}

- (BOOL)handleTdLibParameters:(NSDictionary *)parameters {
    if (!parameters[@"api_id"] || !parameters[@"api_hash"]) {
        NSLog(@"Missing api_id or api_hash in parameters");
        return NO;
    }

    NSString *parametersJSON = [NSString stringWithFormat:
                                 @"{"
                                 "\"@type\":\"setTdlibParameters\","
                                 "\"database_directory\":\"%@/tdlib\","
                                 "\"use_message_database\":true,"
                                 "\"use_secret_chats\":true,"
                                 "\"api_id\":%@,"
                                 "\"api_hash\":\"%@\","
                                 "\"system_language_code\":\"%@\","
                                 "\"device_model\":\"%@\","
                                 "\"system_version\":\"%@\","
                                 "\"application_version\":\"%@\","
                                 "\"enable_storage_optimizer\":true,"
                                 "\"use_file_database\":true"
                                 "}",
                                 NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES)[0],
                                 parameters[@"api_id"],
                                 parameters[@"api_hash"],
                                 parameters[@"system_language_code"] ?: @"en",
                                 parameters[@"device_model"] ?: @"React Native",
                                 parameters[@"system_version"] ?: @"1.0",
                                 parameters[@"application_version"] ?: @"1.0"];

    td_json_client_send(_client, [parametersJSON UTF8String]);
    return YES;
}

- (NSDictionary *)fetchAuthorizationStateWithError:(NSError **)error {
    if (_client == NULL) {
        if (error) {
            *error = [NSError errorWithDomain:@"TDLibErrorDomain"
                                         code:1
                                     userInfo:@{NSLocalizedDescriptionKey: @"TDLib client is not initialized. Call startTdLibService first."}];
        }
        return nil;
    }

    while (true) {
        const char *response = td_json_client_receive(_client, 10.0);
        if (response != NULL) {
            NSString *responseString = [NSString stringWithUTF8String:response];
            NSLog(@"TDLib response: %@", responseString);

            NSDictionary *responseDict = [NSJSONSerialization JSONObjectWithData:[responseString dataUsingEncoding:NSUTF8StringEncoding] options:0 error:error];
            NSString *type = responseDict[@"@type"];

            if ([type hasPrefix:@"authorizationState"]) {
                return responseDict;
            }

            if ([type containsString:@"update"]) {
                NSLog(@"Ignoring update: %@", type);
                continue;
            }
        } else {
            if (error) {
                *error = [NSError errorWithDomain:@"TDLibErrorDomain"
                                             code:2
                                         userInfo:@{NSLocalizedDescriptionKey: @"No response from TDLib"}];
            }
            return nil;
        }
    }
}

@end
