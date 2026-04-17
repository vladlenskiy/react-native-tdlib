package com.reactnativetdlib.tdlibclient;

import com.google.gson.FieldNamingPolicy;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;

import org.drinkless.tdlib.TdApi;

import java.lang.reflect.Type;
import java.util.Map;

/**
 * Gson configured to match TDLib's native JSON shape:
 *  - snake_case field names
 *  - every TdApi.Object gets an "@type" property with the lowercase-first-letter class name
 *
 * Gives platform parity with iOS, which uses TDLib's native JSON directly.
 */
public final class TdLibJson {
    private TdLibJson() {}

    public static final Gson GSON = new GsonBuilder()
        .setFieldNamingPolicy(FieldNamingPolicy.LOWER_CASE_WITH_UNDERSCORES)
        .registerTypeHierarchyAdapter(TdApi.Object.class, new TdApiSerializer())
        .disableHtmlEscaping()
        .create();

    public static String toJson(Object obj) {
        if (obj == null) return "null";
        return GSON.toJson(obj);
    }

    private static final class TdApiSerializer implements JsonSerializer<TdApi.Object> {
        // Inner Gson: snake_case + this serializer disabled (to avoid recursion on the top object).
        // For nested TdApi.Object values, Gson re-invokes this serializer via context.serialize.
        private static final Gson INNER = new GsonBuilder()
            .setFieldNamingPolicy(FieldNamingPolicy.LOWER_CASE_WITH_UNDERSCORES)
            .disableHtmlEscaping()
            .create();

        @Override
        public JsonElement serialize(TdApi.Object src, Type type, JsonSerializationContext ctx) {
            if (src == null) return null;
            // Serialize fields via a plain Gson, then splice in @type, plus recursively
            // enrich any nested JsonObjects whose source value was a TdApi.Object.
            JsonElement tree = INNER.toJsonTree(src);
            if (tree.isJsonObject()) {
                JsonObject obj = tree.getAsJsonObject();
                JsonObject out = new JsonObject();
                out.addProperty("@type", typeName(src.getClass().getSimpleName()));
                for (Map.Entry<String, JsonElement> e : obj.entrySet()) {
                    out.add(e.getKey(), e.getValue());
                }
                // nested enrichment
                enrich(src, out);
                return out;
            }
            return tree;
        }

        /**
         * Walk reflective fields of the TdApi object; for each field whose runtime value is a
         * TdApi.Object, replace the JsonObject at the corresponding JSON key with its serialized
         * form (which in turn goes through this serializer — @type injected, recurses).
         */
        private void enrich(TdApi.Object src, JsonObject out) {
            java.lang.reflect.Field[] fields = src.getClass().getFields();
            for (java.lang.reflect.Field f : fields) {
                Object v;
                try {
                    v = f.get(src);
                } catch (IllegalAccessException ignored) {
                    continue;
                }
                if (v == null) continue;
                String jsonKey = snakeCase(f.getName());
                if (v instanceof TdApi.Object) {
                    out.add(jsonKey, serialize((TdApi.Object) v, null, null));
                } else if (v instanceof TdApi.Object[]) {
                    TdApi.Object[] arr = (TdApi.Object[]) v;
                    com.google.gson.JsonArray ja = new com.google.gson.JsonArray();
                    for (TdApi.Object item : arr) {
                        if (item == null) {
                            ja.add(com.google.gson.JsonNull.INSTANCE);
                        } else {
                            ja.add(serialize(item, null, null));
                        }
                    }
                    out.add(jsonKey, ja);
                }
            }
        }
    }

    private static String typeName(String className) {
        if (className == null || className.isEmpty()) return className;
        return Character.toLowerCase(className.charAt(0)) + className.substring(1);
    }

    private static String snakeCase(String s) {
        if (s == null || s.isEmpty()) return s;
        StringBuilder sb = new StringBuilder(s.length() + 8);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isUpperCase(c)) {
                if (i > 0) sb.append('_');
                sb.append(Character.toLowerCase(c));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
