Pod::Spec.new do |s|
  s.name         = "react-native-tdlib"
  s.version      = "1.0.0"
  s.summary      = "React Native wrapper for TDLib"
  s.homepage     = "https://github.com/yourusername/react-native-tdlib"
  s.license      = { :type => "MIT" }
  s.author       = { "Your Name" => "your.email@example.com" }
  s.platform     = :ios, "11.0"
  s.source       = { :path => "." }
  s.source_files = "ios/**/*.h", "ios/**/*.mm"
  s.public_header_files = "ios/**/*.h"

  # Подключаем библиотеку
  s.vendored_libraries = "ios/Libraries/tdjson/lib/libtdjson.dylib"

  # Если используете .xcframework вместо .dylib
#   s.vendored_frameworks = "ios/Libraries/tdjson/libtdjson.xcframework"

  # Настраиваем пути заголовков через xcconfig
  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/ios/Libraries/tdjson/include\""
  }

  # Добавляем зависимости от React Native
  s.dependency "React-Core"
end
