#import "TdLibModule.h"
#include "td/telegram/td_json_client.h"
#import <React/RCTBridge.h>
#import <React/RCTLog.h>

// Request timeout — reject promises that don't get a TDLib response.
static const NSTimeInterval kTdLibRequestTimeoutSeconds = 60.0;

@implementation TdLibModule {
    void *_client;
    NSLock *_clientLock;
    BOOL _hasListeners;
    BOOL _receiveLoopRunning;
    NSMutableDictionary<NSString *, RCTPromiseResolveBlock> *_pendingResolvers;
    NSMutableDictionary<NSString *, RCTPromiseRejectBlock> *_pendingRejectors;
    NSMutableDictionary<NSString *, NSDate *> *_pendingDeadlines;
    NSLock *_promiseLock;
    int _nextRequestId;
}

RCT_EXPORT_MODULE();

- (instancetype)init {
    self = [super init];
    if (self) {
        _pendingResolvers = [NSMutableDictionary new];
        _pendingRejectors = [NSMutableDictionary new];
        _pendingDeadlines = [NSMutableDictionary new];
        _promiseLock = [NSLock new];
        _clientLock = [NSLock new];
        _nextRequestId = 1;
    }
    return self;
}

- (void)dealloc {
    [self stopReceiveLoop];
    [_clientLock lock];
    void *c = _client;
    _client = NULL;
    [_clientLock unlock];
    if (c) {
        td_json_client_destroy(c);
    }
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

// ==================== Event Emitter ====================

- (NSArray<NSString *> *)supportedEvents {
    return @[@"tdlib-update"];
}

- (void)startObserving {
    _hasListeners = YES;
}

- (void)stopObserving {
    _hasListeners = NO;
}

// addListener / removeListeners are inherited from RCTEventEmitter — DO NOT
// override with no-ops here. Overriding breaks the internal listener counter,
// and sendEventWithName will silently drop every update.

// ==================== Receive Loop ====================

- (void)startReceiveLoop {
    if (_receiveLoopRunning) return;
    _receiveLoopRunning = YES;

    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSDate *nextReap = [NSDate dateWithTimeIntervalSinceNow:5.0];
        while (self->_receiveLoopRunning) {
            [self->_clientLock lock];
            void *c = self->_client;
            [self->_clientLock unlock];
            if (c == NULL) break;

            const char *response = td_json_client_receive(c, 1.0);

            // Reap timed-out requests periodically.
            if ([[NSDate date] compare:nextReap] == NSOrderedDescending) {
                [self reapTimedOutRequests];
                nextReap = [NSDate dateWithTimeIntervalSinceNow:5.0];
            }

            if (response == NULL) continue;

            NSString *responseString = [NSString stringWithUTF8String:response];
            NSData *data = [responseString dataUsingEncoding:NSUTF8StringEncoding];
            NSDictionary *responseDict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
            if (!responseDict) continue;

            NSString *extra = responseDict[@"@extra"];
            NSString *type = responseDict[@"@type"] ?: @"unknown";

            // Dispatch to pending promise if @extra is present
            if (extra) {
                [self->_promiseLock lock];
                RCTPromiseResolveBlock resolve = self->_pendingResolvers[extra];
                RCTPromiseRejectBlock reject = self->_pendingRejectors[extra];
                [self->_pendingResolvers removeObjectForKey:extra];
                [self->_pendingRejectors removeObjectForKey:extra];
                [self->_pendingDeadlines removeObjectForKey:extra];
                [self->_promiseLock unlock];

                if (resolve) {
                    if ([type isEqualToString:@"error"]) {
                        NSString *errorMsg = responseDict[@"message"] ?: @"Unknown TDLib error";
                        NSString *errorCode = [NSString stringWithFormat:@"%@", responseDict[@"code"] ?: @"0"];
                        if (reject) {
                            reject(errorCode, errorMsg, nil);
                        }
                    } else {
                        resolve(responseString);
                    }
                }
                continue;
            }

            // Emit update events — always try; RCTEventEmitter drops if nobody
            // is subscribed yet, but checking _hasListeners from a bg thread
            // has a race window where we'd drop a legitimately-observed event.
            if ([type hasPrefix:@"update"]) {
                NSDictionary *event = @{
                    @"type": type,
                    @"raw": responseString
                };
                [self sendEventWithName:@"tdlib-update" body:event];
            }

            // If TDLib closed (after logOut/destroy), tear down the client so the
            // next startTdLib can create a fresh one.
            if ([type isEqualToString:@"updateAuthorizationState"]) {
                NSDictionary *authState = responseDict[@"authorization_state"];
                NSString *innerType = authState[@"@type"];
                if ([innerType isEqualToString:@"authorizationStateClosed"]) {
                    self->_receiveLoopRunning = NO;
                    [self->_clientLock lock];
                    void *toDestroy = self->_client;
                    self->_client = NULL;
                    [self->_clientLock unlock];
                    [self rejectAllPending:@"CLIENT_CLOSED"
                                   message:@"TDLib client was closed"];
                    if (toDestroy) {
                        td_json_client_destroy(toDestroy);
                    }
                    break;
                }
            }
        }
    });
}

- (void)stopReceiveLoop {
    _receiveLoopRunning = NO;
}

- (void)reapTimedOutRequests {
    NSDate *now = [NSDate date];
    NSMutableArray<NSString *> *expired = nil;
    [_promiseLock lock];
    for (NSString *reqId in _pendingDeadlines) {
        if ([now compare:_pendingDeadlines[reqId]] == NSOrderedDescending) {
            if (!expired) expired = [NSMutableArray new];
            [expired addObject:reqId];
        }
    }
    NSMutableArray *toReject = nil;
    if (expired) {
        toReject = [NSMutableArray new];
        for (NSString *reqId in expired) {
            RCTPromiseRejectBlock reject = _pendingRejectors[reqId];
            if (reject) [toReject addObject:reject];
            [_pendingResolvers removeObjectForKey:reqId];
            [_pendingRejectors removeObjectForKey:reqId];
            [_pendingDeadlines removeObjectForKey:reqId];
        }
    }
    [_promiseLock unlock];
    for (RCTPromiseRejectBlock reject in toReject) {
        reject(@"TDLIB_TIMEOUT", @"TDLib request timed out", nil);
    }
}

- (void)rejectAllPending:(NSString *)code message:(NSString *)message {
    [_promiseLock lock];
    NSArray<RCTPromiseRejectBlock> *rejectors = [_pendingRejectors allValues];
    [_pendingResolvers removeAllObjects];
    [_pendingRejectors removeAllObjects];
    [_pendingDeadlines removeAllObjects];
    [_promiseLock unlock];
    for (RCTPromiseRejectBlock reject in rejectors) {
        reject(code, message, nil);
    }
}

// ==================== Request Helpers ====================

- (NSString *)nextRequestId {
    [_promiseLock lock];
    NSString *reqId = [NSString stringWithFormat:@"rn_tdlib_%d", _nextRequestId++];
    [_promiseLock unlock];
    return reqId;
}

/**
 * Send a TDLib request and resolve with the raw JSON response string.
 */
- (void)sendTdLibRequest:(NSDictionary *)request
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
    [_clientLock lock];
    void *c = _client;
    [_clientLock unlock];
    if (c == NULL) {
        reject(@"CLIENT_NOT_INITIALIZED", @"TDLib client is not initialized", nil);
        return;
    }

    NSString *reqId = [self nextRequestId];

    [_promiseLock lock];
    _pendingResolvers[reqId] = resolve;
    _pendingRejectors[reqId] = reject;
    _pendingDeadlines[reqId] = [NSDate dateWithTimeIntervalSinceNow:kTdLibRequestTimeoutSeconds];
    [_promiseLock unlock];

    NSMutableDictionary *requestWithExtra = [request mutableCopy];
    requestWithExtra[@"@extra"] = reqId;

    NSError *error = nil;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:requestWithExtra options:0 error:&error];
    if (error) {
        [_promiseLock lock];
        [_pendingResolvers removeObjectForKey:reqId];
        [_pendingRejectors removeObjectForKey:reqId];
        [_pendingDeadlines removeObjectForKey:reqId];
        [_promiseLock unlock];
        reject(@"JSON_ERROR", error.localizedDescription, nil);
        return;
    }

    NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    td_json_client_send(c, [jsonString UTF8String]);
}

/**
 * Send a TDLib request and resolve with NSDictionary { raw: jsonString }.
 * Matches Android's WritableMap { raw: ... } return pattern.
 */
- (void)sendTdLibRequestWithRawResult:(NSDictionary *)request
                              resolve:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject {
    [self sendTdLibRequest:request resolve:^(id result) {
        resolve(@{@"raw": result ?: @""});
    } reject:reject];
}

// ==================== Base API Methods ====================

RCT_EXPORT_METHOD(td_json_client_create:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        [_clientLock lock];
        if (_client == NULL) {
            _client = td_json_client_create();
        }
        [_clientLock unlock];
        resolve(@"TDLib client created");
    } @catch (NSException *exception) {
        reject(@"CREATE_CLIENT_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(td_json_client_execute:(NSDictionary *)request
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        [_clientLock lock];
        void *c = _client;
        [_clientLock unlock];
        if (c == NULL) {
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
        const char *response = td_json_client_execute(c, [requestString UTF8String]);

        if (response != NULL) {
            resolve([NSString stringWithUTF8String:response]);
        } else {
            reject(@"EXECUTE_ERROR", @"No response from TDLib", nil);
        }
    } @catch (NSException *exception) {
        reject(@"EXECUTE_EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getTextEntities:(NSString *)text
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    void *c = NULL;
    @try {
        // Use a short-lived client so this pure helper doesn't depend on the
        // main TDLib session lifecycle managed by startTdLib/destroy.
        c = td_json_client_create();

        NSDictionary *request = @{
            @"@type": @"getTextEntities",
            @"text": text ?: @""
        };

        NSError *error = nil;
        NSData *requestData = [NSJSONSerialization dataWithJSONObject:request options:0 error:&error];
        if (error) {
            td_json_client_destroy(c);
            reject(@"JSON_SERIALIZATION_ERROR", error.localizedDescription, nil);
            return;
        }

        NSString *requestString = [[NSString alloc] initWithData:requestData encoding:NSUTF8StringEncoding];
        const char *response = td_json_client_execute(c, [requestString UTF8String]);
        NSString *responseString = response != NULL ? [NSString stringWithUTF8String:response] : nil;
        td_json_client_destroy(c);
        c = NULL;

        if (responseString != nil) {
            resolve(responseString);
        } else {
            reject(@"GET_TEXT_ENTITIES_ERROR", @"No response from TDLib", nil);
        }
    } @catch (NSException *exception) {
        if (c != NULL) {
            td_json_client_destroy(c);
        }
        reject(@"GET_TEXT_ENTITIES_EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(td_json_client_send:(NSDictionary *)request
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        [_clientLock lock];
        void *c = _client;
        [_clientLock unlock];
        if (c == NULL) {
            reject(@"CLIENT_NOT_INITIALIZED", @"TDLib client is not initialized", nil);
            return;
        }

        NSDictionary *actualRequest = request;

        // Handle legacy setTdlibParameters format with nested "parameters" key
        if ([request[@"@type"] isEqualToString:@"setTdlibParameters"] && request[@"parameters"]) {
            NSDictionary *params = request[@"parameters"];
            NSString *dbPath = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES)[0]
                                stringByAppendingPathComponent:@"tdlib"];

            actualRequest = @{
                @"@type": @"setTdlibParameters",
                @"database_directory": dbPath,
                @"use_message_database": @YES,
                @"use_secret_chats": @YES,
                @"api_id": params[@"api_id"],
                @"api_hash": params[@"api_hash"],
                @"system_language_code": params[@"system_language_code"] ?: @"en",
                @"device_model": params[@"device_model"] ?: @"React Native",
                @"system_version": params[@"system_version"] ?: @"1.0",
                @"application_version": params[@"application_version"] ?: @"1.0",
                @"enable_storage_optimizer": @YES,
                @"use_file_database": @YES
            };
        }

        // Fire-and-forget: matches TDLib C API semantics.
        // Caller retrieves response via td_json_client_receive.
        NSError *error = nil;
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:actualRequest options:0 error:&error];
        if (error) {
            reject(@"JSON_SERIALIZATION_ERROR", error.localizedDescription, nil);
            return;
        }

        NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
        td_json_client_send(c, [jsonString UTF8String]);
        resolve(@"Request sent successfully");
    } @catch (NSException *exception) {
        reject(@"SEND_EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(td_json_client_receive:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [_clientLock lock];
    void *c = _client;
    [_clientLock unlock];
    if (c == NULL) {
        reject(@"CLIENT_NOT_INITIALIZED", @"TDLib client not initialized", nil);
        return;
    }

    if (_receiveLoopRunning) {
        reject(@"RECEIVE_LOOP_ACTIVE",
               @"Cannot use td_json_client_receive while the high-level API (startTdLib) is active. "
               @"Use NativeEventEmitter to listen for 'tdlib-update' events instead.", nil);
        return;
    }

    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        [self->_clientLock lock];
        void *inner = self->_client;
        [self->_clientLock unlock];
        if (inner == NULL) {
            reject(@"CLIENT_NOT_INITIALIZED", @"TDLib client not initialized", nil);
            return;
        }
        const char *response = td_json_client_receive(inner, 10.0);
        if (response) {
            resolve([NSString stringWithUTF8String:response]);
        } else {
            reject(@"RECEIVE_ERROR", @"No response from TDLib", nil);
        }
    });
}

// ==================== High-Level API ====================

RCT_EXPORT_METHOD(startTdLib:(NSDictionary *)parameters
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        [_clientLock lock];
        if (_client != NULL) {
            [_clientLock unlock];
            resolve(@"TDLib already started");
            return;
        }
        _client = td_json_client_create();
        void *c = _client;
        [_clientLock unlock];

        td_json_client_send(c, "{\"@type\":\"setLogVerbosityLevel\",\"new_verbosity_level\":0}");

        [self startReceiveLoop];

        NSString *dbPath = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES)[0]
                            stringByAppendingPathComponent:@"tdlib"];

        NSDictionary *params = @{
            @"@type": @"setTdlibParameters",
            @"database_directory": dbPath,
            @"use_message_database": @YES,
            @"use_secret_chats": @YES,
            @"api_id": parameters[@"api_id"],
            @"api_hash": parameters[@"api_hash"],
            @"system_language_code": parameters[@"system_language_code"] ?: @"en",
            @"device_model": parameters[@"device_model"] ?: @"React Native",
            @"system_version": parameters[@"system_version"] ?: @"1.0",
            @"application_version": parameters[@"application_version"] ?: @"1.0",
            @"enable_storage_optimizer": @YES,
            @"use_file_database": @YES
        };

        [self sendTdLibRequest:params resolve:^(id result) {
            resolve(@"TDLib service started successfully");
        } reject:reject];
    } @catch (NSException *exception) {
        reject(@"TDLIB_START_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(login:(NSDictionary *)userDetails
                  promise:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSString *countryCode = userDetails[@"countrycode"];
        NSString *phoneNumber = userDetails[@"phoneNumber"];
        if (!countryCode || !phoneNumber) {
            reject(@"INVALID_INPUT", @"Both countrycode and phoneNumber must be provided", nil);
            return;
        }

        NSString *fullPhoneNumber = [NSString stringWithFormat:@"%@%@", countryCode, phoneNumber];

        NSDictionary *request = @{
            @"@type": @"setAuthenticationPhoneNumber",
            @"phone_number": fullPhoneNumber,
            @"settings": @{
                @"@type": @"phoneNumberAuthenticationSettings",
                @"allow_flash_call": @NO,
                @"allow_missed_call": @NO,
                @"is_current_phone_number": @YES,
                @"allow_sms_retriever_api": @YES
            }
        };

        [self sendTdLibRequest:request resolve:^(id result) {
            resolve(@"Phone number set successfully");
        } reject:reject];
    } @catch (NSException *exception) {
        reject(@"LOGIN_EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(verifyPhoneNumber:(NSString *)otp
                  promise:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (!otp) {
        reject(@"INVALID_INPUT", @"otp must be provided", nil);
        return;
    }
    NSDictionary *request = @{
        @"@type": @"checkAuthenticationCode",
        @"code": otp
    };
    [self sendTdLibRequest:request resolve:^(id result) {
        resolve(@"Verification successful");
    } reject:reject];
}

RCT_EXPORT_METHOD(verifyPassword:(NSString *)password
                  promise:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (!password) {
        reject(@"INVALID_INPUT", @"password must be provided", nil);
        return;
    }
    NSDictionary *request = @{
        @"@type": @"checkAuthenticationPassword",
        @"password": password
    };
    [self sendTdLibRequest:request resolve:^(id result) {
        resolve(@"Password verification successful");
    } reject:reject];
}

RCT_EXPORT_METHOD(getAuthorizationState:(RCTPromiseResolveBlock)resolve
                              rejecter:(RCTPromiseRejectBlock)reject) {
    // Match Android: return only {"@type": "..."} for shape parity.
    [self sendTdLibRequest:@{@"@type": @"getAuthorizationState"} resolve:^(id result) {
        NSData *data = [result dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
        NSString *type = dict[@"@type"];
        if (type) {
            NSData *out = [NSJSONSerialization dataWithJSONObject:@{@"@type": type} options:0 error:nil];
            resolve([[NSString alloc] initWithData:out encoding:NSUTF8StringEncoding]);
        } else {
            resolve(result);
        }
    } reject:reject];
}

RCT_EXPORT_METHOD(getProfile:(RCTPromiseResolveBlock)resolve
                          rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequest:@{@"@type": @"getMe"} resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(logout:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequest:@{@"@type": @"logOut"} resolve:^(id result) {
        resolve(@"Logout successful");
    } reject:reject];
}

RCT_EXPORT_METHOD(destroy:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequest:@{@"@type": @"destroy"} resolve:^(id result) {
        [self stopReceiveLoop];
        [self->_clientLock lock];
        void *c = self->_client;
        self->_client = NULL;
        [self->_clientLock unlock];
        [self rejectAllPending:@"CLIENT_DESTROYED" message:@"TDLib client was destroyed"];
        if (c) {
            td_json_client_destroy(c);
        }
        resolve(@"TDLib destroyed");
    } reject:reject];
}

// ==================== Chat Operations ====================

RCT_EXPORT_METHOD(getChat:(double)chatId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequestWithRawResult:@{@"@type": @"getChat", @"chat_id": @((long long)chatId)}
                                resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(openChat:(double)chatId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequest:@{@"@type": @"openChat", @"chat_id": @((long long)chatId)} resolve:^(id result) {
        // After opening, fetch the chat to return updated data wrapped in {raw}
        [self sendTdLibRequestWithRawResult:@{@"@type": @"getChat", @"chat_id": @((long long)chatId)}
                                    resolve:resolve reject:reject];
    } reject:reject];
}

RCT_EXPORT_METHOD(closeChat:(double)chatId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequest:@{@"@type": @"closeChat", @"chat_id": @((long long)chatId)} resolve:^(id result) {
        resolve(@{@"success": @YES});
    } reject:reject];
}

RCT_EXPORT_METHOD(searchPublicChat:(NSString *)username
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSString *clean = [username hasPrefix:@"@"] ? [username substringFromIndex:1] : username;
    [self sendTdLibRequest:@{@"@type": @"searchPublicChat", @"username": clean} resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(searchChats:(NSString *)query
                  limit:(int)limit
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    int safeLimit = MAX(1, MIN(limit, 50));
    // Match Android: return JSON array of full chat objects, preserving order.
    [self sendTdLibRequest:@{@"@type": @"searchChats", @"query": query ?: @"", @"limit": @(safeLimit)} resolve:^(id result) {
        NSData *data = [result dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
        NSArray *chatIds = dict[@"chat_ids"];
        if (!chatIds || chatIds.count == 0) {
            resolve(@"[]");
            return;
        }
        NSUInteger count = chatIds.count;
        NSMutableArray *results = [[NSMutableArray alloc] initWithCapacity:count];
        for (NSUInteger i = 0; i < count; i++) [results addObject:[NSNull null]];
        dispatch_group_t group = dispatch_group_create();
        for (NSUInteger i = 0; i < count; i++) {
            dispatch_group_enter(group);
            NSUInteger index = i;
            [self sendTdLibRequest:@{@"@type": @"getChat", @"chat_id": chatIds[i]}
                           resolve:^(id chatResult) {
                @synchronized (results) {
                    if (chatResult) results[index] = chatResult;
                }
                dispatch_group_leave(group);
            } reject:^(NSString *code, NSString *message, NSError *error) {
                dispatch_group_leave(group);
            }];
        }
        dispatch_group_notify(group, dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
            NSMutableArray *ordered = [NSMutableArray new];
            for (id item in results) {
                if (item != [NSNull null]) [ordered addObject:item];
            }
            NSString *json = [NSString stringWithFormat:@"[%@]", [ordered componentsJoinedByString:@","]];
            resolve(json);
        });
    } reject:reject];
}

RCT_EXPORT_METHOD(joinChat:(double)chatId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequestWithRawResult:@{@"@type": @"joinChat", @"chat_id": @((long long)chatId)}
                                resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(leaveChat:(double)chatId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequestWithRawResult:@{@"@type": @"leaveChat", @"chat_id": @((long long)chatId)}
                                resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(createPrivateChat:(double)userId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequest:@{@"@type": @"createPrivateChat", @"user_id": @((long long)userId), @"force": @NO}
                   resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getChatMember:(double)chatId
                  userId:(double)userId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"getChatMember",
        @"chat_id": @((long long)chatId),
        @"member_id": @{
            @"@type": @"messageSenderUser",
            @"user_id": @((long long)userId)
        }
    };
    [self sendTdLibRequestWithRawResult:request resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getSupergroup:(double)supergroupId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequestWithRawResult:@{@"@type": @"getSupergroup", @"supergroup_id": @((int)supergroupId)}
                                resolve:resolve reject:reject];
}

// ==================== Chat List ====================

RCT_EXPORT_METHOD(loadChats:(int)limit
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"loadChats",
        @"limit": @(limit)
    };
    [self sendTdLibRequest:request resolve:^(id result) {
        resolve(@"Chats loaded successfully");
    } reject:^(NSString *code, NSString *message, NSError *error) {
        // Error 404 means end of chat list
        if ([code isEqualToString:@"404"]) {
            resolve(@"No more chats to load");
        } else {
            reject(code, message, error);
        }
    }];
}

RCT_EXPORT_METHOD(getChats:(int)limit
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"getChats",
        @"limit": @(limit)
    };
    [self sendTdLibRequest:request resolve:^(id result) {
        NSData *data = [result dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
        NSArray *chatIds = dict[@"chat_ids"];

        if (!chatIds || chatIds.count == 0) {
            resolve(@"[]");
            return;
        }

        NSUInteger count = chatIds.count;
        NSMutableArray *results = [[NSMutableArray alloc] initWithCapacity:count];
        for (NSUInteger i = 0; i < count; i++) {
            [results addObject:[NSNull null]];
        }
        dispatch_group_t group = dispatch_group_create();

        for (NSUInteger i = 0; i < count; i++) {
            dispatch_group_enter(group);
            NSUInteger index = i;
            [self sendTdLibRequest:@{@"@type": @"getChat", @"chat_id": chatIds[i]}
                           resolve:^(id chatResult) {
                @synchronized (results) {
                    results[index] = chatResult ?: [NSNull null];
                }
                dispatch_group_leave(group);
            } reject:^(NSString *code, NSString *message, NSError *error) {
                dispatch_group_leave(group);
            }];
        }

        dispatch_group_notify(group, dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
            NSMutableArray *ordered = [NSMutableArray new];
            for (id item in results) {
                if (item != [NSNull null]) {
                    [ordered addObject:item];
                }
            }
            NSString *json = [NSString stringWithFormat:@"[%@]", [ordered componentsJoinedByString:@","]];
            resolve(json);
        });
    } reject:reject];
}

// ==================== Message Operations ====================

RCT_EXPORT_METHOD(getMessage:(double)chatId
                  messageId:(double)messageId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"getMessage",
        @"chat_id": @((long long)chatId),
        @"message_id": @((long long)messageId)
    };
    [self sendTdLibRequestWithRawResult:request resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getChatHistory:(double)chatId
                  fromMessageId:(double)fromMessageId
                  limit:(int)limit
                  offset:(int)offset
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"getChatHistory",
        @"chat_id": @((long long)chatId),
        @"from_message_id": @((long long)fromMessageId),
        @"offset": @(offset),
        @"limit": @(limit),
        @"only_local": @NO
    };
    [self sendTdLibRequest:request resolve:^(id result) {
        NSData *data = [result dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
        NSArray *messages = dict[@"messages"];

        NSMutableArray *resultArray = [NSMutableArray new];
        if (messages) {
            for (NSDictionary *message in messages) {
                NSData *msgData = [NSJSONSerialization dataWithJSONObject:message options:0 error:nil];
                NSString *msgJson = [[NSString alloc] initWithData:msgData encoding:NSUTF8StringEncoding];
                [resultArray addObject:@{@"raw_json": msgJson}];
            }
        }
        resolve(resultArray);
    } reject:reject];
}

RCT_EXPORT_METHOD(sendMessage:(double)chatId
                  text:(NSString *)text
                  replyToMessageId:(double)replyToMessageId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSMutableDictionary *request = [@{
        @"@type": @"sendMessage",
        @"chat_id": @((long long)chatId),
        @"input_message_content": @{
            @"@type": @"inputMessageText",
            @"text": @{
                @"@type": @"formattedText",
                @"text": text ?: @""
            }
        }
    } mutableCopy];

    if (replyToMessageId > 0) {
        request[@"reply_to"] = @{
            @"@type": @"inputMessageReplyToMessage",
            @"message_id": @((long long)replyToMessageId)
        };
    }

    [self sendTdLibRequestWithRawResult:request resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(viewMessages:(double)chatId
                  messageIds:(NSArray *)messageIds
                  forceRead:(BOOL)forceRead
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"viewMessages",
        @"chat_id": @((long long)chatId),
        @"message_ids": messageIds,
        @"source": @{@"@type": @"messageSourceChatHistory"},
        @"force_read": @(forceRead)
    };
    [self sendTdLibRequest:request resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getMessageThread:(double)chatId
                  messageId:(double)messageId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"getMessageThread",
        @"chat_id": @((long long)chatId),
        @"message_id": @((long long)messageId)
    };
    [self sendTdLibRequestWithRawResult:request resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getMessageThreadHistory:(double)chatId
                  messageThreadId:(double)messageThreadId
                  fromMessageId:(double)fromMessageId
                  offset:(int)offset
                  limit:(int)limit
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"getMessageThreadHistory",
        @"chat_id": @((long long)chatId),
        @"message_thread_id": @((long long)messageThreadId),
        @"from_message_id": @((long long)fromMessageId),
        @"offset": @(offset),
        @"limit": @(MAX(1, limit))
    };
    [self sendTdLibRequestWithRawResult:request resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getChatMessagePosition:(double)chatId
                  messageId:(double)messageId
                  threadId:(double)threadId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSMutableDictionary *request = [@{
        @"@type": @"getChatMessagePosition",
        @"chat_id": @((long long)chatId),
        @"message_id": @((long long)messageId),
        @"filter": @{@"@type": @"searchMessagesFilterEmpty"}
    } mutableCopy];

    if (threadId != 0) {
        request[@"message_topic"] = @{@"@type": @"messageTopicForum", @"forum_topic_id": @((int)threadId)};
    }

    [self sendTdLibRequest:request resolve:^(id result) {
        NSData *data = [result dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];

        NSMutableDictionary *response = [@{@"raw": result ?: @""} mutableCopy];
        if (dict[@"count"]) {
            response[@"count"] = dict[@"count"];
        }
        resolve(response);
    } reject:reject];
}

RCT_EXPORT_METHOD(getMessagesCompat:(double)chatId
                  messageIds:(NSArray *)messageIds
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"getMessages",
        @"chat_id": @((long long)chatId),
        @"message_ids": messageIds
    };
    [self sendTdLibRequest:request resolve:resolve reject:reject];
}

// ==================== Comments ====================

RCT_EXPORT_METHOD(addComment:(double)chatId
                  threadId:(double)threadId
                  replyToMessageId:(double)replyToMessageId
                  text:(NSString *)text
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSMutableDictionary *request = [@{
        @"@type": @"sendMessage",
        @"chat_id": @((long long)chatId),
        @"input_message_content": @{
            @"@type": @"inputMessageText",
            @"text": @{
                @"@type": @"formattedText",
                @"text": text
            },
            @"clear_draft": @YES
        }
    } mutableCopy];

    if (threadId != 0) {
        request[@"message_topic"] = @{@"@type": @"messageTopicForum", @"forum_topic_id": @((int)threadId)};
    }

    if (replyToMessageId > 0) {
        request[@"reply_to"] = @{
            @"@type": @"inputMessageReplyToMessage",
            @"message_id": @((long long)replyToMessageId)
        };
    }

    [self sendTdLibRequest:request resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(deleteComment:(double)chatId
                  messageId:(double)messageId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"deleteMessages",
        @"chat_id": @((long long)chatId),
        @"message_ids": @[@((long long)messageId)],
        @"revoke": @YES
    };
    [self sendTdLibRequest:request resolve:^(id result) {
        resolve(@(YES));
    } reject:reject];
}

// ==================== Reactions ====================

RCT_EXPORT_METHOD(addMessageReaction:(double)chatId
                  messageId:(double)messageId
                  emoji:(NSString *)emoji
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"addMessageReaction",
        @"chat_id": @((long long)chatId),
        @"message_id": @((long long)messageId),
        @"reaction_type": @{
            @"@type": @"reactionTypeEmoji",
            @"emoji": emoji
        },
        @"is_big": @NO,
        @"update_recent_reactions": @NO
    };
    [self sendTdLibRequest:request resolve:^(id result) {
        resolve(@"Reaction added successfully");
    } reject:reject];
}

RCT_EXPORT_METHOD(removeMessageReaction:(double)chatId
                  messageId:(double)messageId
                  emoji:(NSString *)emoji
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"removeMessageReaction",
        @"chat_id": @((long long)chatId),
        @"message_id": @((long long)messageId),
        @"reaction_type": @{
            @"@type": @"reactionTypeEmoji",
            @"emoji": emoji
        }
    };
    [self sendTdLibRequest:request resolve:^(id result) {
        resolve(@"Reaction removed successfully");
    } reject:reject];
}

RCT_EXPORT_METHOD(getAddedReactions:(double)chatId
                  messageId:(double)messageId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"getMessageAddedReactions",
        @"chat_id": @((long long)chatId),
        @"message_id": @((long long)messageId),
        @"offset": @"",
        @"limit": @50
    };
    [self sendTdLibRequestWithRawResult:request resolve:resolve reject:reject];
}

// ==================== User Operations ====================

RCT_EXPORT_METHOD(getUserProfile:(double)userId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequest:@{@"@type": @"getUser", @"user_id": @((long long)userId)} resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getUserFull:(double)userId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequest:@{@"@type": @"getUserFullInfo", @"user_id": @((long long)userId)} resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getUserProfilePhotos:(double)userId
                  offset:(int)offset
                  limit:(int)limit
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"getUserProfilePhotos",
        @"user_id": @((long long)userId),
        @"offset": @(offset),
        @"limit": @(limit)
    };
    [self sendTdLibRequest:request resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getUsersCompat:(NSArray *)userIds
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (!userIds || userIds.count == 0) {
        resolve(@"[]");
        return;
    }

    NSUInteger count = userIds.count;
    NSMutableArray *results = [[NSMutableArray alloc] initWithCapacity:count];
    for (NSUInteger i = 0; i < count; i++) {
        [results addObject:[NSNull null]];
    }
    dispatch_group_t group = dispatch_group_create();

    for (NSUInteger i = 0; i < count; i++) {
        dispatch_group_enter(group);
        NSUInteger index = i;
        [self sendTdLibRequest:@{@"@type": @"getUser", @"user_id": @([userIds[i] longLongValue])}
                       resolve:^(id result) {
            @synchronized (results) {
                if (result) results[index] = result;
            }
            dispatch_group_leave(group);
        } reject:^(NSString *code, NSString *message, NSError *error) {
            dispatch_group_leave(group);
        }];
    }

    dispatch_group_notify(group, dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSMutableArray *ordered = [NSMutableArray new];
        for (id item in results) {
            if (item != [NSNull null]) {
                [ordered addObject:item];
            }
        }
        NSString *json = [NSString stringWithFormat:@"[%@]", [ordered componentsJoinedByString:@","]];
        resolve(json);
    });
}

// ==================== File Operations ====================

RCT_EXPORT_METHOD(downloadFile:(int)fileId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"downloadFile",
        @"file_id": @(fileId),
        @"priority": @1,
        @"offset": @0,
        @"limit": @0,
        @"synchronous": @YES
    };
    [self sendTdLibRequestWithRawResult:request resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(downloadFileByRemoteId:(NSString *)remoteId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *getFileRequest = @{
        @"@type": @"getRemoteFile",
        @"remote_file_id": remoteId
    };
    [self sendTdLibRequest:getFileRequest resolve:^(id result) {
        NSData *data = [result dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *fileDict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
        NSNumber *fileId = fileDict[@"id"];
        if (fileId) {
            NSDictionary *downloadRequest = @{
                @"@type": @"downloadFile",
                @"file_id": fileId,
                @"priority": @1,
                @"offset": @0,
                @"limit": @0,
                @"synchronous": @YES
            };
            [self sendTdLibRequestWithRawResult:downloadRequest resolve:resolve reject:reject];
        } else {
            reject(@"RESOLVE_FAILED", @"Could not resolve file by remote id", nil);
        }
    } reject:reject];
}

RCT_EXPORT_METHOD(cancelDownloadFile:(int)fileId
                  onlyIfPending:(BOOL)onlyIfPending
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *request = @{
        @"@type": @"cancelDownloadFile",
        @"file_id": @(fileId),
        @"only_if_pending": @(onlyIfPending)
    };
    [self sendTdLibRequestWithRawResult:request resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(cancelDownloadByRemoteId:(NSString *)remoteFileId
                  onlyIfPending:(BOOL)onlyIfPending
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *getFileRequest = @{
        @"@type": @"getRemoteFile",
        @"remote_file_id": remoteFileId
    };
    [self sendTdLibRequest:getFileRequest resolve:^(id result) {
        NSData *data = [result dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *fileDict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
        NSNumber *fileId = fileDict[@"id"];
        if (fileId && [fileId intValue] != 0) {
            NSDictionary *cancelRequest = @{
                @"@type": @"cancelDownloadFile",
                @"file_id": fileId,
                @"only_if_pending": @(onlyIfPending)
            };
            [self sendTdLibRequest:cancelRequest resolve:^(id cancelResult) {
                resolve(@{
                    @"raw": cancelResult ?: @"",
                    @"tdFileId": fileId,
                    @"remoteFileId": remoteFileId
                });
            } reject:reject];
        } else {
            resolve(@{
                @"raw": result ?: @"",
                @"error": @"NO_TD_FILE_ID",
                @"message": @"GetRemoteFile returned file with id=0; cannot cancel by tdFileId."
            });
        }
    } reject:reject];
}

RCT_EXPORT_METHOD(getFile:(int)fileId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequestWithRawResult:@{@"@type": @"getFile", @"file_id": @(fileId)}
                                resolve:resolve reject:reject];
}

// ==================== Options ====================

RCT_EXPORT_METHOD(getOption:(NSString *)name
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self sendTdLibRequest:@{@"@type": @"getOption", @"name": name} resolve:^(id result) {
        NSData *data = [result dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
        NSString *type = dict[@"@type"];

        if ([type isEqualToString:@"optionValueString"]) {
            resolve(dict[@"value"]);
        } else if ([type isEqualToString:@"optionValueInteger"]) {
            resolve([NSString stringWithFormat:@"%@", dict[@"value"]]);
        } else if ([type isEqualToString:@"optionValueBoolean"]) {
            resolve([NSString stringWithFormat:@"%@", dict[@"value"]]);
        } else if ([type isEqualToString:@"optionValueEmpty"]) {
            resolve(nil);
        } else {
            resolve(result);
        }
    } reject:reject];
}

RCT_EXPORT_METHOD(setOption:(NSString *)name
                  value:(NSDictionary *)value
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSString *type = value[@"type"];
    NSMutableDictionary *optionValue = [NSMutableDictionary new];

    if ([type isEqualToString:@"string"]) {
        optionValue[@"@type"] = @"optionValueString";
        optionValue[@"value"] = value[@"value"];
    } else if ([type isEqualToString:@"integer"]) {
        optionValue[@"@type"] = @"optionValueInteger";
        optionValue[@"value"] = value[@"value"];
    } else if ([type isEqualToString:@"boolean"]) {
        optionValue[@"@type"] = @"optionValueBoolean";
        optionValue[@"value"] = value[@"value"];
    } else if ([type isEqualToString:@"empty"]) {
        optionValue[@"@type"] = @"optionValueEmpty";
    } else {
        reject(@"INVALID_OPTION_TYPE", @"type must be one of: string, integer, boolean, empty", nil);
        return;
    }

    NSDictionary *request = @{
        @"@type": @"setOption",
        @"name": name,
        @"value": optionValue
    };
    [self sendTdLibRequest:request resolve:^(id result) {
        resolve(@"Option set successfully");
    } reject:reject];
}

// ==================== Utilities ====================

RCT_EXPORT_METHOD(echoToJs:(NSDictionary *)message) {
    if (_hasListeners) {
        NSDictionary *event = @{
            @"type": @"EchoFromObjC",
            @"payload": message
        };
        [self sendEventWithName:@"tdlib-update" body:event];
    }
}

@end
