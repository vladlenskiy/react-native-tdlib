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
import com.facebook.react.bridge.ReadableArray;

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


import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;


import android.media.MediaMetadataRetriever;
import android.net.Uri;

import androidx.annotation.NonNull;



public class TdLibModule extends ReactContextBaseJavaModule {
    private static final String TAG = "TdLibModule";
    private Client client;
    private final Gson gson = TdLibJson.GSON;

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

            // Fire-and-forget — matches iOS and C API semantics.
            // Responses surface via the global update handler (tdlib-update event).
            client.send(function, null, null);
            promise.resolve("Request sent successfully");
        } catch (Exception e) {
            promise.reject("SEND_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void getTextEntities(String text, Promise promise) {
        try {
            TdApi.Object response = Client.execute(new TdApi.GetTextEntities(text != null ? text : ""));
            if (response != null) {
                promise.resolve(gson.toJson(response));
            } else {
                promise.reject("GET_TEXT_ENTITIES_ERROR", "No response from TDLib");
            }
        } catch (Exception e) {
            promise.reject("GET_TEXT_ENTITIES_EXCEPTION", e.getMessage());
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

            client = Client.create(
                new Client.ResultHandler() {
                    @Override
                    public void onResult(TdApi.Object object) {
                        WritableMap map = Arguments.createMap();
                        String json = gson.toJson(object);

                        // Match iOS: TDLib-style camelCase type and raw=direct TDLib JSON
                        String simple = object.getClass().getSimpleName();
                        String type = simple.isEmpty()
                            ? simple
                            : Character.toLowerCase(simple.charAt(0)) + simple.substring(1);

                        map.putString("type", type);
                        map.putString("raw", json);

                        getReactApplicationContext()
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("tdlib-update", map);

                        // Tear down the client after TDLib fully closes so the next
                        // startTdLib creates a fresh one (logout/destroy path).
                        if (object instanceof TdApi.UpdateAuthorizationState) {
                            TdApi.AuthorizationState st =
                                ((TdApi.UpdateAuthorizationState) object).authorizationState;
                            if (st instanceof TdApi.AuthorizationStateClosed) {
                                client = null;
                            }
                        }

                        if (object instanceof TdApi.UpdateMessageInteractionInfo) {
                            TdApi.UpdateMessageInteractionInfo interaction =
                                    (TdApi.UpdateMessageInteractionInfo) object;
                            Log.d("TDLib", "Interaction update for msg " + interaction.messageId);
                        }

                        if (object instanceof TdApi.UpdateMessageReactions) {
                            TdApi.UpdateMessageReactions reaction =
                                    (TdApi.UpdateMessageReactions) object;
                            Log.d("TDLib", "Reactions update for msg " + reaction.messageId);
                        }
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
public void destroy(Promise promise) {
    try {
        if (client == null) {
            promise.reject("CLIENT_NULL", "Client is not initialized or already destroyed");
            return;
        }

        // Send TDLib Destroy request — destroys all local data without proper logout
        client.send(new TdApi.Destroy(), new Client.ResultHandler() {
            @Override
            public void onResult(TdApi.Object object) {
                if (object instanceof TdApi.Ok) {
                    // TDLib accepted the request; mark local reference cleared
                    client = null;
                    promise.resolve("TDLib destroyed and local client reference cleared");
                } else if (object instanceof TdApi.Error) {
                    TdApi.Error error = (TdApi.Error) object;
                    promise.reject("DESTROY_ERROR", error.message);
                } else {
                    promise.reject("DESTROY_UNKNOWN", "Unknown response from TDLib");
                }
            }
        });
    } catch (Exception e) {
        promise.reject("DESTROY_EXCEPTION", e.getMessage());
    }
}



    @ReactMethod
    public void createPrivateChat(double userId, Promise promise) {
        try {
            TdApi.CreatePrivateChat request = new TdApi.CreatePrivateChat((long) userId, false); 
            // 'false' here means don't force creation if it already exists.
            
            client.send(request, new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    if (object instanceof TdApi.Chat) {
                        // use class-level gson (TdLibJson.GSON)
                        promise.resolve(gson.toJson(object));
                    } else if (object instanceof TdApi.Error) {
                        TdApi.Error error = (TdApi.Error) object;
                        promise.reject("CREATE_PRIVATE_CHAT_ERROR", error.message);
                    } else {
                        promise.reject("CREATE_PRIVATE_CHAT_UNKNOWN", "Unknown response type");
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("CREATE_PRIVATE_CHAT_EXCEPTION", e.getMessage());
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
    public void getUserProfile(double userId, Promise promise) {
        try {
            TdApi.GetUser request = new TdApi.GetUser((long) userId);
            client.send(request, new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    if (object instanceof TdApi.User) {
                        promise.resolve(new Gson().toJson(object));
                    } else if (object instanceof TdApi.Error) {
                        TdApi.Error error = (TdApi.Error) object;
                        promise.reject("GET_USER_PROFILE_ERROR", error.message);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("GET_USER_PROFILE_EXCEPTION", e.getMessage());
        }
    }

@ReactMethod
public void getUserFull(double userId, Promise promise) {
    try {
        if (client == null) {
            promise.reject("GET_USER_FULL_NO_CLIENT", "TDLib client is null");
            return;
        }

        long uid = (long) userId;

        // Use AtomicBoolean so it can be mutated and read inside inner class
        final java.util.concurrent.atomic.AtomicBoolean usingGetUserFull = new java.util.concurrent.atomic.AtomicBoolean(false);

        Object request = null;

        try {
            Class<?> getUserFullClass = Class.forName("org.drinkless.tdlib.TdApi$GetUserFull");
            java.lang.reflect.Constructor<?> ctor = getUserFullClass.getConstructor(long.class);
            request = ctor.newInstance(uid);
            usingGetUserFull.set(true);
        } catch (ClassNotFoundException cnfe) {
            // GetUserFull not available -> fallback
            usingGetUserFull.set(false);
        } catch (NoSuchMethodException | IllegalAccessException | InstantiationException | java.lang.reflect.InvocationTargetException ex) {
            usingGetUserFull.set(false);
        }

        if (!usingGetUserFull.get()) {
            request = new org.drinkless.tdlib.TdApi.GetUser(uid);
        }

        org.drinkless.tdlib.TdApi.Function functionRequest;
        try {
            functionRequest = (org.drinkless.tdlib.TdApi.Function) request;
        } catch (ClassCastException cce) {
            promise.reject("GET_USER_FULL_CAST_ERROR", "Could not cast request to TdApi.Function: " + cce.getMessage());
            return;
        }

        client.send(functionRequest, new org.drinkless.tdlib.Client.ResultHandler() {
            @Override
            public void onResult(org.drinkless.tdlib.TdApi.Object object) {
                try {
                    if (object == null) {
                        promise.reject("GET_USER_FULL_NULL_RESPONSE", "null");
                        return;
                    }

                    String className = object.getClass().getSimpleName();

                    if (usingGetUserFull.get() && ("UserFull".equals(className) || className.endsWith("UserFull"))) {
                        promise.resolve(new com.google.gson.Gson().toJson(object));
                        return;
                    }

                    if ("User".equals(className) || className.endsWith("User")) {
                        promise.resolve(new com.google.gson.Gson().toJson(object));
                        return;
                    }

                    if (object instanceof org.drinkless.tdlib.TdApi.Error) {
                        org.drinkless.tdlib.TdApi.Error error = (org.drinkless.tdlib.TdApi.Error) object;
                        promise.reject("GET_USER_FULL_ERROR_" + error.code, error.message);
                        return;
                    }

                    // Unknown type — return serialized object
                    promise.resolve(new com.google.gson.Gson().toJson(object));
                } catch (Exception ex) {
                    promise.reject("GET_USER_FULL_ONRESULT_EXCEPTION", ex.getMessage());
                }
            }
        });
    } catch (Exception e) {
        promise.reject("GET_USER_FULL_EXCEPTION", e.getMessage());
    }
}

    @ReactMethod
    public void getUserProfilePhotos(double userId, int offset, int limit, Promise promise) {
        try {
            long uid = (long) userId; // تبدیل به long
            TdApi.GetUserProfilePhotos request = new TdApi.GetUserProfilePhotos(uid, offset, limit);

            client.send(request, object -> {
                String rawJson = new Gson().toJson(object);

                if (object.getConstructor() == TdApi.Error.CONSTRUCTOR) {
                    TdApi.Error error = (TdApi.Error) object;
                    promise.reject("TDLIB_ERROR", error.message);
                } else {
                    promise.resolve(rawJson);
                }
            });
        } catch (Exception e) {
            promise.reject("GET_USER_PHOTOS_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void getUsersCompat(ReadableArray userIds, Promise promise) {
        try {
            if (userIds == null || userIds.size() == 0) {
                promise.resolve("[]");
                return;
            }

            final int size = userIds.size();
            final ExecutorService pool = Executors.newFixedThreadPool(Math.min(8, size));
            final CountDownLatch latch = new CountDownLatch(size);
            final List<TdApi.User> users = new CopyOnWriteArrayList<>();

            for (int i = 0; i < size; i++) {
                final long id = (long) userIds.getDouble(i);
                pool.execute(() -> {
                    client.send(new TdApi.GetUser(id), object -> {
                        if (object instanceof TdApi.User) {
                            users.add((TdApi.User) object);
                        }
                        latch.countDown();
                    });
                });
            }

            new Thread(() -> {
                try {
                    latch.await();
                    pool.shutdown();
                    String json = new Gson().toJson(users);
                    promise.resolve(json);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    promise.reject("GET_USERS_COMPAT_INTERRUPTED", e.getMessage());
                }
            }).start();

        } catch (Throwable t) {
            promise.reject("GET_USERS_COMPAT_EXCEPTION", t.getMessage());
        }
    }

    @ReactMethod
    public void getMessagesCompat(double chatId, ReadableArray messageIds, Promise promise) {
        try {
            if (messageIds == null || messageIds.size() == 0) {
                promise.resolve("{\"messages\": []}");
                return;
            }

            // convert messageIds to long[]
            final int size = messageIds.size();
            long[] ids = new long[size];
            for (int i = 0; i < size; i++) {
                ids[i] = (long) messageIds.getDouble(i);
            }

            // build request
            TdApi.GetMessages request = new TdApi.GetMessages((long) chatId, ids);

            // send to TDLib
            client.send(request, object -> {
                String json = new Gson().toJson(object);
                promise.resolve(json);
            });

        } catch (Throwable t) {
            promise.reject("GET_MESSAGES_COMPAT_EXCEPTION", t.getMessage());
        }
    }


@ReactMethod
public void searchPublicChat(String username, Promise promise) {
    if (client == null) {
        promise.reject("NO_CLIENT", "TDLib client is not initialized");
        return;
    }
    if (username == null || username.trim().isEmpty()) {
        promise.reject("INVALID_USERNAME", "username is empty");
        return;
    }

    final String clean = username.startsWith("@") ? username.substring(1) : username;

    try {
        TdApi.SearchPublicChat request = new TdApi.SearchPublicChat(clean);
        client.send(request, object -> {
            if (object == null) {
                promise.reject("NULL_RESPONSE", "TDLib returned null");
                return;
            }

            if (object.getConstructor() == TdApi.Error.CONSTRUCTOR) {
                TdApi.Error error = (TdApi.Error) object;
                // include error code as the error code string, and message as details
                promise.reject(Integer.toString(error.code), error.message != null ? error.message : "unknown error");
                return;
            }

            if (object.getConstructor() == TdApi.Chat.CONSTRUCTOR) {
                TdApi.Chat chat = (TdApi.Chat) object;
                // Option A — send JSON string to JS:
                String rawJson = new Gson().toJson(chat);
                promise.resolve(rawJson);

                // Option B — (recommended) convert to WritableMap to return structured data:
                // WritableMap map = Arguments.createMap();
                // map.putDouble("id", chat.id);
                // if (chat.title != null) map.putString("title", chat.title);
                // if (chat.username != null) map.putString("username", chat.username);
                // // etc...
                // promise.resolve(map);
                return;
            }

            // Fallback — return whatever TDLib gave as JSON
            promise.resolve(new Gson().toJson(object));
        });
    } catch (Exception e) {
        promise.reject("SEARCH_PUBLIC_CHAT_EXCEPTION", e.getMessage() == null ? e.toString() : e.getMessage());
    }
}









@ReactMethod
public void searchChats(String query, int limit, Promise promise) {
    if (client == null) {
        promise.reject("NO_CLIENT", "TDLib client is not initialized");
        return;
    }
    if (query == null) query = "";
    final String q = query.trim();
    final int lim = Math.max(1, Math.min(limit, 50)); // sanitize limit

    try {
        TdApi.SearchChats req = new TdApi.SearchChats(q, lim);
        client.send(req, resp -> {
            try {
                if (resp == null) {
                    promise.resolve("[]");
                    return;
                }
                if (resp.getConstructor() == TdApi.Error.CONSTRUCTOR) {
                    TdApi.Error err = (TdApi.Error) resp;
                    promise.reject(Integer.toString(err.code), err.message != null ? err.message : "searchChats error");
                    return;
                }
                if (resp.getConstructor() == TdApi.Chats.CONSTRUCTOR) {
                    TdApi.Chats chats = (TdApi.Chats) resp;
                    long[] ids = chats.chatIds != null ? chats.chatIds : new long[0];
                    if (ids.length == 0) {
                        promise.resolve("[]");
                        return;
                    }
                    // fetch each chat preserving order
                    final String[] out = new String[ids.length];
                    final CountDownLatch latch = new CountDownLatch(ids.length);
                    for (int i = 0; i < ids.length; i++) {
                        final int index = i;
                        client.send(new TdApi.GetChat(ids[i]), chatObj -> {
                            try {
                                if (chatObj != null && chatObj.getConstructor() == TdApi.Chat.CONSTRUCTOR) {
                                    out[index] = gson.toJson(chatObj);
                                }
                            } catch (Exception ignored) {}
                            finally { latch.countDown(); }
                        });
                    }
                    // Offload await to a worker thread so we don't block the TDLib callback dispatcher.
                    new Thread(() -> {
                        try {
                            boolean completed = latch.await(10, TimeUnit.SECONDS);
                            if (!completed) {
                                promise.reject("SEARCHCHATS_TIMEOUT",
                                    "Timed out waiting for chat details (" + latch.getCount() + " remaining)");
                                return;
                            }
                        } catch (InterruptedException ignored) {
                            Thread.currentThread().interrupt();
                            promise.reject("SEARCHCHATS_INTERRUPTED", "Interrupted while fetching chat details");
                            return;
                        }
                        StringBuilder sb = new StringBuilder("[");
                        boolean first = true;
                        for (String r : out) {
                            if (r != null) {
                                if (!first) sb.append(",");
                                sb.append(r);
                                first = false;
                            }
                        }
                        sb.append("]");
                        promise.resolve(sb.toString());
                    }).start();
                    return;
                }
                // fallback: return whatever responded
                promise.resolve(gson.toJson(resp));
            } catch (Exception e) {
                promise.reject("SEARCHCHATS_EXCEPTION", e.getMessage());
            }
        });
    } catch (Exception e) {
        promise.reject("SEARCHCHATS_EXCEPTION", e.getMessage());
    }
}








    @ReactMethod
    public void getChatHistory(double chatId, double fromMessageId, int limit, int offset, Promise promise) {
        try {
            TdApi.GetChatHistory request = new TdApi.GetChatHistory(
                    (long) chatId,
                    (long) fromMessageId,
                    offset,
                    limit,
                    false
            );

            client.send(request, object -> {
                if (object instanceof TdApi.Messages) {
                    TdApi.Messages messages = (TdApi.Messages) object;
                    WritableArray resultArray = Arguments.createArray();
                    // use class-level gson (TdLibJson.GSON)

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
                // use class-level gson (TdLibJson.GSON)
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
    public void downloadFileByRemoteId(String remoteId, Promise promise) {
        try {
            TdApi.GetRemoteFile getFileRequest = new TdApi.GetRemoteFile(remoteId, null);
            client.send(getFileRequest, object -> {
                if (object instanceof TdApi.File) {
                    int fileId = ((TdApi.File) object).id;
                    TdApi.DownloadFile downloadRequest = new TdApi.DownloadFile(fileId, 1, 0, 0, true);
                    client.send(downloadRequest, result -> {
                        // use class-level gson (TdLibJson.GSON)
                        String json = gson.toJson(result);
                        WritableMap map = Arguments.createMap();
                        map.putString("raw", json);
                        promise.resolve(map);
                    });
                } else {
                    promise.reject("RESOLVE_FAILED", "Could not resolve file by remote id");
                }
            });
        } catch (Exception e) {
            promise.reject("DOWNLOAD_ERROR", e.getMessage());
        }
    }

    public class TdlibProbeModule extends ReactContextBaseJavaModule {
  private final ReactApplicationContext reactContext;

  public TdlibProbeModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @NonNull
  @Override
  public String getName() {
    return "TdlibProbe";
  }

  /**
   * Checks if Android can read basic metadata (duration) from the given local path.
   * Returns Promise.resolve(true) if playable, otherwise false.
   * path should be an absolute filesystem path (like /data/data/...)
   */
  @ReactMethod
  public void isPlayable(String path, Promise promise) {
    try {
      if (path == null || path.length() == 0) {
        promise.resolve(false);
        return;
      }

      MediaMetadataRetriever retriever = new MediaMetadataRetriever();
      try {
        // If path contains file://, strip it for local files
        String realPath = path.startsWith("file://") ? path.substring(7) : path;
        retriever.setDataSource(realPath);
        String duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
        retriever.release();
        promise.resolve(duration != null && duration.length() > 0);
      } catch (Exception e) {
        try { retriever.release(); } catch (Exception ignored) {}
        promise.resolve(false);
      }
    } catch (Exception ex) {
      promise.resolve(false);
    }
  }
}

    @ReactMethod
    public void cancelDownloadFile(int fileId, boolean onlyIfPending, Promise promise) {
        try {
            TdApi.CancelDownloadFile request = new TdApi.CancelDownloadFile(fileId, onlyIfPending);
            client.send(request, object -> {
                // use class-level gson (TdLibJson.GSON)
                String json = gson.toJson(object);
                WritableMap result = Arguments.createMap();
                result.putString("raw", json);
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("CANCEL_DOWNLOAD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void cancelDownloadByRemoteId(String remoteFileId, boolean onlyIfPending, Promise promise) {
        try {
            // 1) درخواست گرفتن اطلاعات فایل از روی remote id
            TdApi.GetRemoteFile getReq = new TdApi.GetRemoteFile(remoteFileId, null);
            client.send(getReq, getFileResult -> {
                try {
                    // use class-level gson (TdLibJson.GSON)

                    // در برخی bindingها ممکنه object از نوع TdApi.File یا TdApi.Error برگرده
                    if (getFileResult instanceof TdApi.File) {
                        TdApi.File file = (TdApi.File) getFileResult;
                        int tdFileId = file.id; // this is TDLib file id (int)
                        
                        // اگر tdFileId معتبر باشه -> میتونیم cancel کنیم
                        if (tdFileId != 0) {
                            TdApi.CancelDownloadFile cancelReq = new TdApi.CancelDownloadFile(tdFileId, onlyIfPending);
                            client.send(cancelReq, cancelRes -> {
                                try {
                                    String json = gson.toJson(cancelRes);
                                    WritableMap result = Arguments.createMap();
                                    result.putString("raw", json);
                                    // اطلاعات مفیدتر هم میتونید اضافه کنید:
                                    result.putInt("tdFileId", tdFileId);
                                    result.putString("remoteFileId", remoteFileId);
                                    promise.resolve(result);
                                } catch (Exception e) {
                                    promise.reject("CANCEL_BY_REMOTE_CB_ERROR", e.getMessage());
                                }
                            });
                        } else {
                            // فایل شناسه td (محلی) نداره — نمیشه مستقیم cancel کرد
                            WritableMap result = Arguments.createMap();
                            result.putString("raw", gson.toJson(getFileResult));
                            result.putString("error", "NO_TD_FILE_ID");
                            result.putString("message", "GetRemoteFile returned file with id=0; cannot cancel by tdFileId.");
                            promise.resolve(result);
                        }
                    } else {
                        // اگر یک ارور یا چیز دیگه برگشت (مثلاً TdApi.Error)
                        String json = gson.toJson(getFileResult);
                        WritableMap result = Arguments.createMap();
                        result.putString("raw", json);
                        promise.resolve(result);
                    }
                } catch (Exception ex) {
                    promise.reject("CANCEL_BY_REMOTE_ERROR", ex.getMessage());
                }
            });
        } catch (Exception e) {
            promise.reject("CANCEL_BY_REMOTE_THROW", e.getMessage());
        }
    }

    @ReactMethod
    public void getFile(int fileId, Promise promise) {
        try {
            TdApi.GetFile request = new TdApi.GetFile(fileId);
            client.send(request, object -> {
                // use class-level gson (TdLibJson.GSON)
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("GET_FILE_ERROR", e.getMessage());
        }
    }

@ReactMethod
public void sendMessage(double chatId, String text, double replyToMessageId, Promise promise) {
    try {
        TdApi.InputMessageText input = new TdApi.InputMessageText(
            new TdApi.FormattedText(text, null),
            null,
            false
        );

        TdApi.MessageSendOptions sendOptions = new TdApi.MessageSendOptions(
            null,   // InputSuggestedPostInfo
            false,  // disableNotification
            false,  // fromBackground
            false,  // protectContent
            false,  // updateOrderOfInstalledStickerSets
            0L,     // replyToMessageId (deprecated on options; use InputMessageReplyTo below)
            false,  // onlyPreview
            null,   // schedulingState
            0L,     // effectId
            0,      // sendingId
            false   // sendAsDraft
        );

        TdApi.InputMessageReplyTo replyTo = replyToMessageId > 0
            ? new TdApi.InputMessageReplyToMessage((long) replyToMessageId, null, 0)
            : null;

        TdApi.SendMessage request = new TdApi.SendMessage(
            (long) chatId,
            null,   // MessageTopic (null = normal chat)
            replyTo,
            sendOptions,
            null,
            input
        );

        client.send(request, object -> {
            WritableMap result = Arguments.createMap();
            result.putString("raw", gson.toJson(object));
            promise.resolve(result);
        });

    } catch (Exception e) {
        promise.reject("SEND_ERROR", e);
    }
}

    @ReactMethod
    public void getMessage(double chatId, double messageId, Promise promise) {
        try {
            long chatIdLong = (long) chatId;
            long messageIdLong = (long) messageId;

            // ارسال ViewMessages برای اطمینان از آپدیت شدن interactionInfo
            TdApi.ViewMessages viewMessages = new TdApi.ViewMessages(
                chatIdLong,
                new long[]{messageIdLong},
                new TdApi.MessageSourceChatHistory(), // یا null
                true
            );

            client.send(viewMessages, ignored -> {
                try {
                    Thread.sleep(300); // صبر برای آپدیت interactionInfo
                } catch (InterruptedException e) {
                    Log.w("TDLib", "Sleep interrupted");
                }

                // گرفتن پیام
                TdApi.GetMessage request = new TdApi.GetMessage(chatIdLong, messageIdLong);
                client.send(request, messageObject -> {
                    WritableMap result = Arguments.createMap();
                    result.putString("raw", gson.toJson(messageObject));
                    promise.resolve(result);
                });
            });

        } catch (Exception e) {
            promise.reject("GET_MESSAGE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void openChat(double chatId, Promise promise) {
        try {
            long chatIdLong = (long) chatId;

            TdApi.OpenChat openChat = new TdApi.OpenChat(chatIdLong);
            client.send(openChat, ignored -> {
                try {
                    Thread.sleep(300); // مکث کوتاه برای بروزرسانی state چت
                } catch (InterruptedException e) {
                    Log.w("TDLib", "Sleep interrupted");
                }

                TdApi.GetChat getChat = new TdApi.GetChat(chatIdLong);
                client.send(getChat, chatObject -> {
                    WritableMap result = Arguments.createMap();
                    result.putString("raw", gson.toJson(chatObject));
                    promise.resolve(result);
                });
            });

        } catch (Exception e) {
            promise.reject("OPEN_CHAT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void closeChat(double chatId, Promise promise) {
        try {
            long chatIdLong = (long) chatId;

            TdApi.CloseChat closeChat = new TdApi.CloseChat(chatIdLong);
            client.send(closeChat, result -> {
                WritableMap res = Arguments.createMap();
                res.putBoolean("success", true);
                promise.resolve(res);
            });

        } catch (Exception e) {
            promise.reject("CLOSE_CHAT_ERROR", e.getMessage());
        }
}


    @ReactMethod
    public void getAddedReactions(double chatId, double messageId, Promise promise) {
        try {
            long chatIdLong = (long) chatId;
            long messageIdLong = (long) messageId;

            TdApi.GetMessageAddedReactions addedReactionsRequest = new TdApi.GetMessageAddedReactions(
                chatIdLong,
                messageIdLong,
                null,   // واکنش خاص نمی‌خوایم، همه رو می‌گیریم
                "",     // offset اول
                50      // حداکثر ۵۰ ری‌اکشن
            );

            client.send(addedReactionsRequest, result -> {
                WritableMap map = Arguments.createMap();
                map.putString("raw", gson.toJson(result));
                promise.resolve(map);
            });

        } catch (Exception e) {
            promise.reject("GET_ADDED_REACTIONS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getChat(double chatId, Promise promise) {
        try {
            TdApi.GetChat request = new TdApi.GetChat((long) chatId);
            client.send(request, object -> {
                // use class-level gson (TdLibJson.GSON)
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("GET_CHAT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getSupergroup(double supergroupId, Promise promise) {
        try {
            TdApi.GetSupergroup request = new TdApi.GetSupergroup((int) supergroupId);
            client.send(request, object -> {
                // use class-level gson (TdLibJson.GSON)
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("GET_SUPERGROUP_ERROR", e.getMessage());
        }
    }


    @ReactMethod
    public void joinChat(double chatId, Promise promise) {
        try {
            TdApi.JoinChat request = new TdApi.JoinChat((long) chatId);
            client.send(request, object -> {
                // use class-level gson (TdLibJson.GSON)
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("JOIN_CHAT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void leaveChat(double chatId, Promise promise) {
        try {
            TdApi.LeaveChat request = new TdApi.LeaveChat((long) chatId);
            client.send(request, object -> {
                // use class-level gson (TdLibJson.GSON)
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("LEAVE_CHAT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getChatMember(double chatId, double userId, Promise promise) {
        try {
            TdApi.MessageSender user = new TdApi.MessageSenderUser((long) userId);
            TdApi.GetChatMember request = new TdApi.GetChatMember((long) chatId, user);
            client.send(request, object -> {
                // use class-level gson (TdLibJson.GSON)
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("GET_CHAT_MEMBER_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getMessageThread(double chatId, double messageId, Promise promise) {
        try {
            TdApi.GetMessageThread request = new TdApi.GetMessageThread((long) chatId, (long) messageId);
            client.send(request, object -> {
                // use class-level gson (TdLibJson.GSON)
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("GET_MESSAGE_THREAD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getMessageThreadHistory(double chatId, double messageThreadId, double fromMessageId,int offset, int limit, Promise promise) {
        try {
            int safeLimit = Math.max(limit, 1);
            int safeOffset = offset > 0 ? 0 : offset; // مطمئن شو offset مثبت نیست

            TdApi.GetMessageThreadHistory request = new TdApi.GetMessageThreadHistory(
                (long) chatId,
                (long) messageThreadId,
                (long) fromMessageId,
                safeOffset,
                safeLimit
            );

            client.send(request, object -> {
                // use class-level gson (TdLibJson.GSON)
                WritableMap result = Arguments.createMap();
                result.putString("raw", gson.toJson(object));
                promise.resolve(result);
            });
        } catch (Exception e) {
            promise.reject("GET_THREAD_HISTORY_ERROR", e.getMessage());
        }
    }

@ReactMethod
public void getChatMessagePosition(double chatId, double messageId, double threadId, Promise promise) {
    try {
        TdApi.MessageTopic topic =
            threadId != 0
                ? new TdApi.MessageTopicForum((int) threadId) // MUST be int
                : null;

        TdApi.GetChatMessagePosition request =
            new TdApi.GetChatMessagePosition(
                (long) chatId,
                topic,
                new TdApi.SearchMessagesFilterEmpty(),
                (long) messageId
            );

        client.send(request, object -> {
            WritableMap result = Arguments.createMap();
            result.putString("raw", new Gson().toJson(object));

            if (object instanceof TdApi.Count) {
                result.putInt("count", ((TdApi.Count) object).count);
            }

            promise.resolve(result);
        });

    } catch (Exception e) {
        promise.reject("GET_MESSAGE_POSITION_ERROR", e);
    }
}



    @ReactMethod
    public void viewMessages(double chatId, ReadableArray messageIds, boolean forceRead, Promise promise) {
        try {
            long[] ids = new long[messageIds.size()];
            for (int i = 0; i < messageIds.size(); i++) {
                ids[i] = (long) messageIds.getDouble(i);
            }

            TdApi.ViewMessages view = new TdApi.ViewMessages(
                (long) chatId,
                ids,
                new TdApi.MessageSourceChatHistory(), // user viewed messages inside the chat
                forceRead
            );

            client.send(view, result -> {
                promise.resolve(gson.toJson(result));
            });
        } catch (Exception e) {
            promise.reject("VIEW_MESSAGES_ERROR", e.getMessage());
        }
    }

@ReactMethod
public void addComment(
    double chatId,
    double threadId,
    double replyToMessageId,
    String text,
    Promise promise
) {
    try {
        TdApi.InputMessageText content = new TdApi.InputMessageText(
            new TdApi.FormattedText(text, null),
            null,
            true
        );

        TdApi.MessageSendOptions sendOptions = new TdApi.MessageSendOptions(
            null,
            false,
            false,
            false,
            false,
            replyToMessageId > 0 ? (long) replyToMessageId : 0L,
            false,
            null,
            0L,
            0,
            false
        );

        TdApi.InputMessageReplyTo replyTo =
            replyToMessageId > 0
                ? new TdApi.InputMessageReplyToMessage(
                    (long) replyToMessageId,
                    null,
                    0
                  )
                : null;

        TdApi.MessageTopic topic = threadId != 0
            ? new TdApi.MessageTopicForum((int) threadId)
            : null;

        TdApi.SendMessage sendMessage = new TdApi.SendMessage(
            (long) chatId,
            topic,
            replyTo,
            sendOptions,
            null,
            content
        );

        client.send(sendMessage, result -> {
            if (result instanceof TdApi.Message) {
                promise.resolve(new Gson().toJson(result));
            } else {
                promise.reject("SEND_FAILED", new Gson().toJson(result));
            }
        });

    } catch (Exception e) {
        promise.reject("ADD_COMMENT_ERROR", e);
    }
}


        @ReactMethod
        public void deleteComment(double chatId, double messageId, Promise promise) {
            try {
                TdApi.DeleteMessages deleteMessages = new TdApi.DeleteMessages(
                    (long) chatId,
                    new long[]{ (long) messageId },
                    true  // revoke for everyone (delete for all)
                );

                client.send(deleteMessages, result -> {
                    if (result instanceof TdApi.Ok) {
                        promise.resolve(true);
                    } else {
                        promise.reject("DELETE_FAILED", new Gson().toJson(result));
                    }
                });
            } catch (Exception e) {
                promise.reject("DELETE_COMMENT_ERROR", e.getMessage());
            }
        }




   @ReactMethod
    public void echoToJs(ReadableMap message) {
        WritableMap result = Arguments.createMap();
        result.putMap("payload", message);
        result.putString("type", "EchoFromJava");

        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("tdlib-update", result);
    }

    // Required to support EventEmitter in JS
    @ReactMethod
    public void addListener(String eventName) {}
    @ReactMethod
    public void removeListeners(double count) {}


    @ReactMethod
    public void loadChats(int limit, Promise promise) {
        try {
            if (client == null) {
                promise.reject("CLIENT_NOT_INITIALIZED", "TDLib client is not initialized");
                return;
            }

            TdApi.LoadChats request = new TdApi.LoadChats(null, limit);
            client.send(request, object -> {
                if (object instanceof TdApi.Ok) {
                    promise.resolve("Chats loaded successfully");
                } else if (object instanceof TdApi.Error) {
                    TdApi.Error error = (TdApi.Error) object;
                    // Error 404 means we've reached the end of the chat list
                    if (error.code == 404) {
                        promise.resolve("No more chats to load");
                    } else {
                        promise.reject("LOAD_CHATS_ERROR", error.message);
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("LOAD_CHATS_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void getChats(int limit, Promise promise) {
        try {
            if (client == null) {
                promise.reject("CLIENT_NOT_INITIALIZED", "TDLib client is not initialized");
                return;
            }

            TdApi.GetChats request = new TdApi.GetChats(null, limit);
            client.send(request, object -> {
                if (object instanceof TdApi.Chats) {
                    TdApi.Chats chats = (TdApi.Chats) object;
                    long[] ids = chats.chatIds != null ? chats.chatIds : new long[0];

                    if (ids.length == 0) {
                        promise.resolve("[]");
                        return;
                    }

                    final String[] results = new String[ids.length];
                    final CountDownLatch latch = new CountDownLatch(ids.length);

                    for (int i = 0; i < ids.length; i++) {
                        final int index = i;
                        client.send(new TdApi.GetChat(ids[i]), chatObj -> {
                            try {
                                if (chatObj instanceof TdApi.Chat) {
                                    results[index] = gson.toJson(chatObj);
                                }
                            } catch (Exception ignored) {
                            } finally {
                                latch.countDown();
                            }
                        });
                    }

                    new Thread(() -> {
                        try {
                            boolean completed = latch.await(10, TimeUnit.SECONDS);
                            if (!completed) {
                                promise.reject("GET_CHATS_TIMEOUT",
                                    "Timed out waiting for chat details (" + latch.getCount() + " remaining)");
                                return;
                            }
                            StringBuilder sb = new StringBuilder("[");
                            boolean first = true;
                            for (String r : results) {
                                if (r != null) {
                                    if (!first) sb.append(",");
                                    sb.append(r);
                                    first = false;
                                }
                            }
                            sb.append("]");
                            promise.resolve(sb.toString());
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            promise.reject("GET_CHATS_INTERRUPTED", e.getMessage());
                        }
                    }).start();
                } else if (object instanceof TdApi.Error) {
                    TdApi.Error error = (TdApi.Error) object;
                    promise.reject("GET_CHATS_ERROR", error.message);
                }
            });
        } catch (Exception e) {
            promise.reject("GET_CHATS_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void getOption(String name, Promise promise) {
        try {
            if (client == null) {
                promise.reject("CLIENT_NOT_INITIALIZED", "TDLib client is not initialized");
                return;
            }

            TdApi.GetOption request = new TdApi.GetOption(name);
            client.send(request, object -> {
                if (object instanceof TdApi.OptionValueString) {
                    promise.resolve(((TdApi.OptionValueString) object).value);
                } else if (object instanceof TdApi.OptionValueInteger) {
                    promise.resolve(String.valueOf(((TdApi.OptionValueInteger) object).value));
                } else if (object instanceof TdApi.OptionValueBoolean) {
                    promise.resolve(String.valueOf(((TdApi.OptionValueBoolean) object).value));
                } else if (object instanceof TdApi.OptionValueEmpty) {
                    promise.resolve(null);
                } else if (object instanceof TdApi.Error) {
                    TdApi.Error error = (TdApi.Error) object;
                    promise.reject("GET_OPTION_ERROR", error.message);
                } else {
                    promise.resolve(gson.toJson(object));
                }
            });
        } catch (Exception e) {
            promise.reject("GET_OPTION_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void setOption(String name, ReadableMap value, Promise promise) {
        try {
            if (client == null) {
                promise.reject("CLIENT_NOT_INITIALIZED", "TDLib client is not initialized");
                return;
            }

            TdApi.OptionValue optionValue;
            String type = value.getString("type");

            if ("string".equals(type)) {
                optionValue = new TdApi.OptionValueString(value.getString("value"));
            } else if ("integer".equals(type)) {
                optionValue = new TdApi.OptionValueInteger((long) value.getDouble("value"));
            } else if ("boolean".equals(type)) {
                optionValue = new TdApi.OptionValueBoolean(value.getBoolean("value"));
            } else if ("empty".equals(type)) {
                optionValue = new TdApi.OptionValueEmpty();
            } else {
                promise.reject("INVALID_OPTION_TYPE", "type must be one of: string, integer, boolean, empty");
                return;
            }

            TdApi.SetOption request = new TdApi.SetOption(name, optionValue);
            client.send(request, object -> {
                if (object instanceof TdApi.Ok) {
                    promise.resolve("Option set successfully");
                } else if (object instanceof TdApi.Error) {
                    TdApi.Error error = (TdApi.Error) object;
                    promise.reject("SET_OPTION_ERROR", error.message);
                }
            });
        } catch (Exception e) {
            promise.reject("SET_OPTION_EXCEPTION", e.getMessage());
        }
    }

    @ReactMethod
    public void addMessageReaction(double chatId, double messageId, String emoji, Promise promise) {
        try {
            TdApi.ReactionType reactionType = new TdApi.ReactionTypeEmoji(emoji);

            TdApi.AddMessageReaction request = new TdApi.AddMessageReaction(
                    (long) chatId,
                    (long) messageId,
                    reactionType,
                    false,  // isBig
                    false   // updateRecentReactions
            );

            client.send(request, object -> {
                if (object instanceof TdApi.Ok) {
                    promise.resolve("Reaction added successfully");
                } else {
                    promise.reject("ADD_REACTION_FAILED", object.toString());
                }
            });
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }



    @ReactMethod
    public void removeMessageReaction(double chatId, double messageId, String emoji, Promise promise) {
        try {
            TdApi.ReactionType reactionType = new TdApi.ReactionTypeEmoji(emoji);

            TdApi.RemoveMessageReaction request = new TdApi.RemoveMessageReaction(
                    (long) chatId,
                    (long) messageId,
                    reactionType
            );

            client.send(request, object -> {
                if (object instanceof TdApi.Ok) {
                    promise.resolve("Reaction removed successfully");
                } else {
                    promise.reject("REMOVE_REACTION_FAILED", object.toString());
                }
            });
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }



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

            case "getTextEntities": {
                String text = (String) requestMap.get("text");
                return new TdApi.GetTextEntities(text != null ? text : "");
            }

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

            case "searchPublicChat": {
                String username = (String) requestMap.get("username");
                return new TdApi.SearchPublicChat(username);
            }

            case "downloadFile": {
                int fileId = ((Number) requestMap.get("file_id")).intValue();
                Number priorityNum = (Number) requestMap.get("priority");
                int priority = priorityNum != null ? priorityNum.intValue() : 1;
                Number offsetNum = (Number) requestMap.get("offset");
                long offset = offsetNum != null ? offsetNum.longValue() : 0L;
                Number limitNum = (Number) requestMap.get("limit");
                long limit = limitNum != null ? limitNum.longValue() : 0L;
                Object syncObj = requestMap.get("synchronous");
                boolean synchronous = syncObj instanceof Boolean ? (Boolean) syncObj : false;
                return new TdApi.DownloadFile(fileId, priority, offset, limit, synchronous);
            }

            case "sendChatAction": {
                long chatIdAction = ((Number) requestMap.get("chat_id")).longValue();
                Object actionObj = requestMap.get("action");
                TdApi.ChatAction action = new TdApi.ChatActionTyping();
                if (actionObj instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> actMap = (Map<String, Object>) actionObj;
                    String actType = (String) actMap.get("@type");
                    if ("chatActionCancel".equals(actType)) action = new TdApi.ChatActionCancel();
                    else if ("chatActionRecordingVoiceNote".equals(actType))
                        action = new TdApi.ChatActionRecordingVoiceNote();
                    else if ("chatActionUploadingPhoto".equals(actType))
                        action = new TdApi.ChatActionUploadingPhoto(0);
                    // default stays ChatActionTyping
                }
                // TdApi.SendChatAction(chatId, messageTopic, businessConnectionId, action)
                return new TdApi.SendChatAction(chatIdAction, null, null, action);
            }

            case "viewMessages": {
                long chatIdView = ((Number) requestMap.get("chat_id")).longValue();
                Object idsObj = requestMap.get("message_ids");
                long[] ids = new long[0];
                if (idsObj instanceof java.util.List) {
                    java.util.List<?> idsList = (java.util.List<?>) idsObj;
                    ids = new long[idsList.size()];
                    for (int i = 0; i < idsList.size(); i++) {
                        ids[i] = ((Number) idsList.get(i)).longValue();
                    }
                }
                Object forceObj = requestMap.get("force_read");
                boolean forceRead = forceObj instanceof Boolean ? (Boolean) forceObj : false;
                return new TdApi.ViewMessages(chatIdView, ids, new TdApi.MessageSourceChatHistory(), forceRead);
            }

            case "addMessageReaction": {
                long cid = ((Number) requestMap.get("chat_id")).longValue();
                long mid = ((Number) requestMap.get("message_id")).longValue();
                @SuppressWarnings("unchecked")
                Map<String, Object> rt = (Map<String, Object>) requestMap.get("reaction_type");
                String emoji = rt != null ? (String) rt.get("emoji") : "";
                return new TdApi.AddMessageReaction(
                    cid, mid, new TdApi.ReactionTypeEmoji(emoji), false, false);
            }

            case "removeMessageReaction": {
                long cid = ((Number) requestMap.get("chat_id")).longValue();
                long mid = ((Number) requestMap.get("message_id")).longValue();
                @SuppressWarnings("unchecked")
                Map<String, Object> rt = (Map<String, Object>) requestMap.get("reaction_type");
                String emoji = rt != null ? (String) rt.get("emoji") : "";
                return new TdApi.RemoveMessageReaction(
                    cid, mid, new TdApi.ReactionTypeEmoji(emoji));
            }

            default:
                throw new UnsupportedOperationException("Unsupported TDLib function: " + type);
        }
    }

}
