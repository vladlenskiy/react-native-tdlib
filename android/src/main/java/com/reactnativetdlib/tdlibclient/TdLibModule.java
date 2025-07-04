package com.reactnativetdlib.tdlibclient;

import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;


import android.util.Base64;

import com.google.gson.Gson;

import org.drinkless.tdlib.Client;
import org.drinkless.tdlib.TdApi;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.Map;
import java.util.HashMap;
import org.json.JSONObject;
import org.json.JSONException;
import com.facebook.react.modules.core.DeviceEventManagerModule;



public class TdLibModule extends ReactContextBaseJavaModule {
    private static final String TAG = "TdLibModule";
    private Client client;
    private final Gson gson = new Gson();

    private final ReactApplicationContext reactContext;
    public TdLibModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return "TdLibModule";
    }

    // ==================== Base API ====================
    @ReactMethod
    public void td_json_client_create(Promise promise) {
        try {
            if (client == null) {
                client = Client.create(
                        new Client.ResultHandler() {
                            @Override
                            public void onResult(TdApi.Object object) {
                                Log.d(TAG, "Global Update: " + gson.toJson(object));
                            }
                        },
                        null,
                        null
                );
                promise.resolve("TDLib client created");
            } else {
                promise.resolve("TDLib client already exists");
            }
        } catch (Exception e) {
            promise.reject("CREATE_CLIENT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void td_json_client_execute(ReadableMap request, Promise promise) {
        try {
            if (client == null) {
                promise.reject("CLIENT_NOT_INITIALIZED", "TDLib client is not initialized");
                return;
            }

            Map<String, Object> requestMap = request.toHashMap();
            TdApi.Function function = convertMapToFunction(requestMap);

            TdApi.Object response = Client.execute(function);
            if (response != null) {
                promise.resolve(gson.toJson(response));
            } else {
                promise.reject("EXECUTE_ERROR", "No response from TDLib");
            }
        } catch (Exception e) {
            promise.reject("EXECUTE_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void td_json_client_send(ReadableMap request, Promise promise) {
        try {
            if (client == null) {
                promise.reject("CLIENT_NOT_INITIALIZED", "TDLib client is not initialized");
                return;
            }

            Map<String, Object> requestMap = request.toHashMap();
            TdApi.Function function = convertMapToFunction(requestMap);

            client.send(function, new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    promise.resolve(gson.toJson(object));
                }
            });
        } catch (Exception e) {
            promise.reject("SEND_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void td_json_client_receive(Promise promise) {
        try {
            if (client == null) {
                promise.reject("CLIENT_NOT_INITIALIZED", "TDLib client is not initialized");
                return;
            }

            CountDownLatch latch = new CountDownLatch(1);
            AtomicReference<TdApi.Object> responseRef = new AtomicReference<>();

            client.send(null, new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    responseRef.set(object);
                    latch.countDown();
                }
            });

            boolean awaitSuccess = latch.await(10, TimeUnit.SECONDS);
            if (awaitSuccess && responseRef.get() != null) {
                promise.resolve(gson.toJson(responseRef.get()));
            } else {
                promise.reject("RECEIVE_ERROR", "No response from TDLib");
            }
        } catch (Exception e) {
            promise.reject("RECEIVE_EXCEPTION", e.getMessage());
        }
    }

    // @ReactMethod
    // public void td_json_client_receive(Promise promise) {
    //     try {
    //         TdApi.Object object = Client.receive(1.0); // منتظر دریافت تا 1 ثانیه
    //         if (object != null) {
    //             promise.resolve(gson.toJson(object));
    //         } else {
    //             promise.resolve(null); // دریافت نشده، اما خطا هم نیست
    //         }
    //     } catch (Exception e) {
    //         promise.reject("RECEIVE_EXCEPTION", e.getMessage());
    //     }
    // }



    // ==================== High-Level API ====================

    @ReactMethod
    public void startTdLib(ReadableMap parameters, Promise promise) {
        try {
            if (client != null) {
                promise.resolve("TDLib already started");
                return;
            }

            // client = Client.create(
            //         new Client.ResultHandler() {
            //             @Override
            //             public void onResult(TdApi.Object object) {
            //                 Log.d(TAG, "Global Update: " + object.toString());
            //             }
            //         },
            //         null,
            //         null
            // );

            client = Client.create(
            new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    WritableMap map = Arguments.createMap();
                    map.putString("raw", gson.toJson(object));
                    getReactApplicationContext()
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit("tdlib-update", map);
                }
            },
            null,
            null
        );



            Client.execute(new TdApi.SetLogVerbosityLevel(5));
            setTdLibParameters(parameters, promise);
        } catch (Exception e) {
            promise.reject("TDLIB_START_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getAuthorizationState(Promise promise) {
        try {
            if (client == null) {
                promise.reject("CLIENT_NOT_INITIALIZED", "TDLib client is not initialized");
                return;
            }

            client.send(new TdApi.GetAuthorizationState(), object -> {
                if (object instanceof TdApi.AuthorizationState) {
                    try {
                        Map<String, Object> responseMap = new HashMap<>();
                        String originalType = object.getClass().getSimpleName();
                        String formattedType = originalType.substring(0, 1).toLowerCase() + originalType.substring(1);

                        responseMap.put("@type", formattedType);
                        promise.resolve(new JSONObject(responseMap).toString());
                    } catch (Exception e) {
                        promise.reject("JSON_CONVERT_ERROR", "Error converting object to JSON: " + e.getMessage());
                    }
                } else if (object instanceof TdApi.Error) {
                    TdApi.Error error = (TdApi.Error) object;
                    promise.reject("AUTH_STATE_ERROR", error.message);
                } else {
                    promise.reject("AUTH_STATE_UNEXPECTED_RESPONSE", "Unexpected response from TDLib.");
                }
            });
        } catch (Exception e) {
            promise.reject("GET_AUTH_STATE_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void login(ReadableMap userDetails, Promise promise) {
        try {
            TdApi.SetAuthenticationPhoneNumber authPhoneNumber = new TdApi.SetAuthenticationPhoneNumber();
            authPhoneNumber.phoneNumber = userDetails.getString("countrycode") + userDetails.getString("phoneNumber");

            client.send(authPhoneNumber, new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    if (object instanceof TdApi.Ok) {
                        promise.resolve("Phone number set successfully");
                    } else if (object instanceof TdApi.Error) {
                        TdApi.Error error = (TdApi.Error) object;
                        promise.reject("LOGIN_ERROR", error.message);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("LOGIN_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void verifyPhoneNumber(String code, Promise promise) {
        try {
            TdApi.CheckAuthenticationCode checkCode = new TdApi.CheckAuthenticationCode();
            checkCode.code = code;

            client.send(checkCode, new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    if (object instanceof TdApi.Ok) {
                        promise.resolve("Verification successful");
                    } else if (object instanceof TdApi.Error) {
                        TdApi.Error error = (TdApi.Error) object;
                        promise.reject("VERIFY_PHONE_NUMBER_ERROR", error.message);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("VERIFY_PHONE_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void verifyPassword(String password, Promise promise) {
        try {
            TdApi.CheckAuthenticationPassword checkPassword = new TdApi.CheckAuthenticationPassword();
            checkPassword.password = password;

            client.send(checkPassword, new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    if (object instanceof TdApi.Ok) {
                        promise.resolve("Password verification successful");
                    } else if (object instanceof TdApi.Error) {
                        TdApi.Error error = (TdApi.Error) object;
                        promise.reject("PASSWORD_ERROR", error.message);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("PASSWORD_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void logout(Promise promise) {
        try {
            client.send(new TdApi.LogOut(), new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    if (object instanceof TdApi.Ok) {
                        promise.resolve("Logout successful");
                    } else if (object instanceof TdApi.Error) {
                        TdApi.Error error = (TdApi.Error) object;
                        promise.reject("LOGOUT_ERROR", error.message);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("LOGOUT_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void getProfile(Promise promise) {
        try {
            TdApi.GetMe request = new TdApi.GetMe();
            client.send(request, new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    if (object instanceof TdApi.User) {
                        promise.resolve(new Gson().toJson(object));
                    } else if (object instanceof TdApi.Error) {
                        TdApi.Error error = (TdApi.Error) object;
                        promise.reject("GET_PROFILE_ERROR", error.message);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("GET_PROFILE_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void getUserProfilePhotos(int userId, int offset, int limit, Promise promise) {
        try {
            TdApi.GetUserProfilePhotos request = new TdApi.GetUserProfilePhotos(userId, offset, limit);
            client.send(request, object -> {
                String rawJson = new Gson().toJson(object);

                // فقط چاپ کن یا مستقیماً به JS بده
                promise.resolve(rawJson);
            });
        } catch (Exception e) {
            promise.reject("GET_USER_PHOTOS_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void getChatHistory(double chatId, double fromMessageId, int limit, Promise promise) {
        try {
            TdApi.GetChatHistory request = new TdApi.GetChatHistory((long) chatId, (long) fromMessageId, 0, limit, false);
            client.send(request, object -> {
                if (object instanceof TdApi.Messages) {
                    TdApi.Messages messages = (TdApi.Messages) object;
                    WritableArray resultArray = Arguments.createArray();
                    Gson gson = new Gson();

                    for (TdApi.Message message : messages.messages) {
                        WritableMap messageMap = Arguments.createMap();
                        String json = gson.toJson(message);
                        messageMap.putString("raw_json", json);
                        resultArray.pushMap(messageMap);
                    }

                    promise.resolve(resultArray);
                } else {
                    promise.reject("NO_MESSAGES", "No messages returned");
                }
            });
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void downloadFile(int fileId, Promise promise) {
        try {
            TdApi.DownloadFile request = new TdApi.DownloadFile(fileId, 1, 0, 0, true);
            client.send(request, object -> {
                Gson gson = new Gson();
                String json = gson.toJson(object);
                WritableMap result = Arguments.createMap();
                result.putString("raw", json);
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("DOWNLOAD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void sendMessage(double chatId, String text, Promise promise) {
        try {
            TdApi.InputMessageText input = new TdApi.InputMessageText(
                new TdApi.FormattedText(text, null),
                null, // LinkPreviewOptions
                false // clearDraft
            );

            TdApi.MessageSendOptions sendOptions = new TdApi.MessageSendOptions(
                false, // disableNotification
                false, // fromBackground
                false, // protectContent
                false, // updateOrderOfInstalledStickerSets
                false, // sendWithBackgroundPriority
                null,  // schedulingState
                0L,    // sendingId
                0,     // sendingFlags
                false  // showSendingAnimation
            );

            TdApi.SendMessage request = new TdApi.SendMessage(
                (long) chatId,
                0, // messageThreadId
                null, // InputMessageReplyTo
                sendOptions,
                null, // ReplyMarkup
                input
            );

            client.send(request, object -> {
                Gson gson = new Gson();
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("SEND_ERROR", e.getMessage());
        }
    }


    @ReactMethod
    public void getMessage(double chatId, double messageId, Promise promise) {
        try {
            TdApi.GetMessage request = new TdApi.GetMessage((long) chatId, (long) messageId);
            client.send(request, object -> {
                Gson gson = new Gson();
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("GET_MESSAGE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getChat(double chatId, Promise promise) {
        try {
            TdApi.GetChat request = new TdApi.GetChat((long) chatId);
            client.send(request, object -> {
                Gson gson = new Gson();
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("GET_CHAT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getMessageComments(double chatId, double messageId, Promise promise) {
        try {
            TdApi.GetMessageThread request = new TdApi.GetMessageThread((long) chatId, (long) messageId);
            client.send(request, object -> {
                Gson gson = new Gson();
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("GET_MESSAGE_COMMENTS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getMessageThread(double chatId, double messageId, Promise promise) {
        try {
            TdApi.GetMessageThread request = new TdApi.GetMessageThread((long) chatId, (long) messageId);
            client.send(request, object -> {
                Gson gson = new Gson();
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("GET_MESSAGE_THREAD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getMessageThreadHistory(double chatId, double messageThreadId, double fromMessageId, int limit, Promise promise) {
        try {
            int safeLimit = Math.max(limit, 1);

            TdApi.GetMessageThreadHistory request = new TdApi.GetMessageThreadHistory(
                (long) chatId,
                (long) messageThreadId,
                (long) fromMessageId,
                0,
                safeLimit
            );

            client.send(request, object -> {
                Gson gson = new Gson();
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("GET_THREAD_HISTORY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getMessageReplies(double chatId, double messageId, int limit, Promise promise) {
        try {
            int safeLimit = Math.max(limit, 1);

            TdApi.SearchChatMessages request = new TdApi.SearchChatMessages(
                (long) chatId,
                "",                                // query: خالی چون ما فقط replyها را می‌خواهیم
                null,                              // sender: همه ارسال‌کنندگان
                0L,                                // fromMessageId: از آخر شروع می‌کند
                0,                                 // offset: صفر
                safeLimit,                         // تعداد پیام‌هایی که می‌خواهیم
                new TdApi.SearchMessagesFilterEmpty(), // چون فیلتر reply در نسخه قدیمی نیست
                (long) messageId,                  // reply_to_message_id: فقط پیام‌هایی که به این پیام پاسخ داده‌اند
                0L                                 // extra (اختیاری)
            );

            client.send(request, object -> {
                Gson gson = new Gson();
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("GET_REPLIES_ERROR", e.getMessage());
        }
    }



   @ReactMethod
    public void echoToJs(ReadableMap message) {
        WritableMap result = Arguments.createMap();
        result.putMap("payload", message);
        result.putString("type", "EchoFromJava");

        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("TDLibUpdate", result);
    }

    // Required to support EventEmitter in JS
    public void addListener(String eventName) {}
    public void removeListeners(double count) {}








    // =================================== Helpers ========================================

    private void setTdLibParameters(ReadableMap parameters, Promise promise) {
        try {
            TdApi.SetTdlibParameters tdlibParameters = new TdApi.SetTdlibParameters();
            tdlibParameters.databaseDirectory = getReactApplicationContext().getFilesDir().getAbsolutePath() + "/tdlib";
            tdlibParameters.useMessageDatabase = true;
            tdlibParameters.useSecretChats = true;
            tdlibParameters.apiId = parameters.getInt("api_id");
            tdlibParameters.apiHash = parameters.getString("api_hash");
            tdlibParameters.systemLanguageCode = parameters.hasKey("system_language_code")
                ? parameters.getString("system_language_code")
                : "en";
            tdlibParameters.deviceModel = parameters.hasKey("device_model")
                ? parameters.getString("device_model")
                : "React Native";
            tdlibParameters.systemVersion = parameters.hasKey("system_version")
                ? parameters.getString("system_version")
                : "1.0";
            tdlibParameters.applicationVersion = parameters.hasKey("application_version")
                ? parameters.getString("application_version")
                : "1.0";
            tdlibParameters.useFileDatabase = true;

            client.send(tdlibParameters, new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    if (object instanceof TdApi.Ok) {
                        promise.resolve("TDLib parameters set successfully");
                    } else if (object instanceof TdApi.Error) {
                        TdApi.Error error = (TdApi.Error) object;
                        promise.reject("TDLIB_PARAMS_ERROR", error.message);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("TDLIB_PARAMS_EXCEPTION", e.getMessage());
        }
    }

    private TdApi.Function convertMapToFunction(Map<String, Object> requestMap) throws Exception {
        String type = (String) requestMap.get("@type");

        switch (type) {
            case "getAuthorizationState":
                return new TdApi.GetAuthorizationState();

            case "setAuthenticationPhoneNumber": {
                String phoneNumber = (String) requestMap.get("phone_number");
                return new TdApi.SetAuthenticationPhoneNumber(phoneNumber, null);
            }

            case "checkAuthenticationCode": {
                String code = (String) requestMap.get("code");
                return new TdApi.CheckAuthenticationCode(code);
            }

            case "close":
                return new TdApi.Close();

            case "getChat": {
                long chatId = ((Number) requestMap.get("chat_id")).longValue();
                return new TdApi.GetChat(chatId);
            }

            case "getMessage": {
                long chatIdMsg = ((Number) requestMap.get("chat_id")).longValue();
                long messageId = ((Number) requestMap.get("message_id")).longValue();
                return new TdApi.GetMessage(chatIdMsg, messageId);
            }

            case "getChatHistory": {
                long chatId = ((Number) requestMap.get("chat_id")).longValue();
                long fromMessageId = ((Number) requestMap.get("from_message_id")).longValue();
                int offset = ((Number) requestMap.get("offset")).intValue();
                int limit = ((Number) requestMap.get("limit")).intValue();
                boolean onlyLocal = (Boolean) requestMap.get("only_local");
                return new TdApi.GetChatHistory(chatId, fromMessageId, offset, limit, onlyLocal);
            }

            case "searchPublicChat":
                String username = (String) requestMap.get("username");
                return new TdApi.SearchPublicChat(username);


            // more functions can go here

            default:
                throw new UnsupportedOperationException("Unsupported TDLib function: " + type);
        }
    }

}
