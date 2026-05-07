package com.reactnativetdlib.tdlibclient;

import com.google.gson.FieldNamingPolicy;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;
import com.google.gson.TypeAdapter;
import com.google.gson.TypeAdapterFactory;
import com.google.gson.reflect.TypeToken;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonWriter;

import org.drinkless.tdlib.TdApi;

import java.io.IOException;
import java.lang.reflect.Modifier;
import java.lang.reflect.Type;
import java.util.Map;

/**
 * Gson configured to match TDLib's native JSON shape:
 *  - snake_case field names
 *  - every TdApi.Object gets an "@type" property with the lowercase-first-letter class name
 *  - reading abstract TdApi types resolves the concrete subclass from "@type"
 *
 * Gives platform parity with iOS, which uses TDLib's native JSON directly.
 */
public final class TdLibJson {
    private TdLibJson() {}

    public static final Gson GSON = new GsonBuilder()
        .setFieldNamingPolicy(FieldNamingPolicy.LOWER_CASE_WITH_UNDERSCORES)
        .registerTypeHierarchyAdapter(TdApi.Object.class, new TdApiSerializer())
        .registerTypeAdapterFactory(new TdApiAbstractTypeFactory())
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

    /**
     * For abstract TdApi types, picks the concrete subclass at read time using the @type
     * discriminator. Concrete types fall through to Gson's default reflection adapter.
     * Mirrors the iOS path, where TDLib's own JSON parser dispatches by @type.
     */
    private static final class TdApiAbstractTypeFactory implements TypeAdapterFactory {
        @Override
        public <T> TypeAdapter<T> create(Gson gson, TypeToken<T> typeToken) {
            Class<? super T> raw = typeToken.getRawType();
            if (!TdApi.Object.class.isAssignableFrom(raw)) return null;
            if (!Modifier.isAbstract(raw.getModifiers())) return null;

            final TypeAdapter<T> delegate = gson.getDelegateAdapter(this, typeToken);
            return new TypeAdapter<T>() {
                @Override
                public void write(JsonWriter out, T value) throws IOException {
                    // The serialization side is handled by the TdApi.Object hierarchy
                    // serializer; for that path Gson never asks our factory to write.
                    // The delegate is here for completeness if the factory ever fires.
                    delegate.write(out, value);
                }

                @Override
                public T read(JsonReader in) throws IOException {
                    JsonElement el = JsonParser.parseReader(in);
                    if (!el.isJsonObject()) return null;
                    JsonObject obj = el.getAsJsonObject();
                    JsonElement typeEl = obj.get("@type");
                    if (typeEl == null) return null;
                    String typeName = typeEl.getAsString();
                    String className = "org.drinkless.tdlib.TdApi$"
                        + Character.toUpperCase(typeName.charAt(0))
                        + typeName.substring(1);
                    try {
                        Class<?> concrete = Class.forName(className);
                        if (!raw.isAssignableFrom(concrete)) return null;
                        @SuppressWarnings("unchecked")
                        TypeAdapter<T> concreteAdapter =
                            (TypeAdapter<T>) gson.getAdapter(TypeToken.get(concrete));
                        return concreteAdapter.fromJsonTree(obj);
                    } catch (ClassNotFoundException e) {
                        return null;
                    }
                }
            };
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
