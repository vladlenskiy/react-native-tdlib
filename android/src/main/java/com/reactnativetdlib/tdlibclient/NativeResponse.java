package com.tgphotocloud.tdlibclient;

import com.facebook.react.bridge.Promise;

import org.drinkless.tdlib.Client;
import org.drinkless.tdlib.TdApi;

public class NativeResponse implements Client.ResultHandler {
    private final Promise promise;

    public NativeResponse(Promise promise) {
        this.promise = promise;
    }

    @Override
    public void onResult(TdApi.Object object) {
        if (object instanceof TdApi.Error) {
            TdApi.Error error = (TdApi.Error) object;
            promise.reject(String.valueOf(error.code), error.message);
        } else {
            promise.resolve(object.toString());
        }
    }
}