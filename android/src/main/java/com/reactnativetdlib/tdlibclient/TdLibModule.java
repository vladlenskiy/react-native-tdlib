package com.reactnativetdlib.tdlibclient;

import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

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

public class TdLibModule extends ReactContextBaseJavaModule {
    private static final String TAG = "TdLibModule";
    private Client client;
    private final Gson gson = new Gson();

    public TdLibModule(ReactApplicationContext reactContext) {
        super(reactContext);
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
                            Log.d(TAG, "Global Update: " + object.toString());
                        }
                    },
                    null,
                    null
            );

            Client.execute(new TdApi.SetLogVerbosityLevel(0));
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

    // ==================== Helpers ====================

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

    // ==================== Helpers ====================
    private TdApi.Function convertMapToFunction(Map<String, Object> requestMap) throws Exception {
        // TODO: Implement conversion logic based on TdApi request types
        throw new UnsupportedOperationException("Conversion not implemented");
    }
}
