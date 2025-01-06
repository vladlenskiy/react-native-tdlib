package com.reactnativetdlib.tdlibclient;

import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

import org.drinkless.tdlib.Client;
import org.drinkless.tdlib.TdApi;

import java.util.HashMap;
import java.util.Map;

public class TdLibModule extends ReactContextBaseJavaModule {

    private static final String TAG = "TdLibModule";
    private Client client;

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
                                Log.d(TAG, "Global Update: " + object.toString());
                            }
                        },
                        null,
                        null
                );
                promise.resolve("TDLib client created");
            } else {
                promise.reject("CLIENT_ALREADY_EXISTS", "TDLib client already exists");
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
            TdApi.Function responseFunction = convertMapToFunction(requestMap);

            TdApi.Object response = Client.execute(responseFunction);

            if (response != null) {
                promise.resolve(response.toString());
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
            TdApi.Function sendFunction = convertMapToFunction(requestMap);

            client.send(sendFunction, new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    promise.resolve(object.toString());
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

            client.send(new TdApi.GetAuthorizationState(), new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    if (object != null) {
                        promise.resolve(object.toString());
                    } else {
                        promise.reject("RECEIVE_ERROR", "No response from TDLib");
                    }
                }
            });
        } catch (Exception e) {
            promise.reject("RECEIVE_EXCEPTION", e.getMessage());
        }
    }

    // ==================== High-Level API ====================

    @ReactMethod
    public void startTdLib(ReadableMap parameters, Promise promise) {
        try {
            if (client == null) {
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
            }

            setTdLibParameters(parameters, promise);
        } catch (Exception e) {
            promise.reject("START_TDLIB_ERROR", e.getMessage());
        }
    }

    private void setTdLibParameters(ReadableMap parameters, Promise promise) {
        try {
            if (!parameters.hasKey("api_id") || !parameters.hasKey("api_hash")) {
                throw new IllegalArgumentException("api_id and api_hash are required");
            }

            TdApi.SetTdlibParameters tdlibParameters = new TdApi.SetTdlibParameters();
            tdlibParameters.databaseDirectory = "tdlib";
            tdlibParameters.useMessageDatabase = true;
            tdlibParameters.useSecretChats = true;
            tdlibParameters.apiId = parameters.getInt("api_id");
            tdlibParameters.apiHash = parameters.getString("api_hash");
            tdlibParameters.systemLanguageCode = parameters.getString("system_language_code");
            tdlibParameters.deviceModel = parameters.getString("device_model");
            tdlibParameters.systemVersion = parameters.getString("system_version");
            tdlibParameters.applicationVersion = parameters.getString("application_version");

            client.send(tdlibParameters, new Client.ResultHandler() {
                @Override
                public void onResult(TdApi.Object object) {
                    promise.resolve("TDLib parameters set successfully");
                }
            });
        } catch (Exception e) {
            promise.reject("SET_PARAMETERS_ERROR", e.getMessage());
        }
    }

    private TdApi.Function convertMapToFunction(Map<String, Object> requestMap) throws Exception {
        // Convert Map<String, Object> to TdApi.Function (custom logic)
        // This must map the request map to a valid TdApi.Function object.
        throw new UnsupportedOperationException("Implement conversion logic here");
    }
}