# React Native TDLib

[![NPM Version](https://img.shields.io/npm/v/react-native-tdlib.svg?style=flat-square)](https://www.npmjs.com/package/react-native-tdlib)
[![License](https://img.shields.io/npm/l/react-native-tdlib.svg?style=flat-square)](./LICENSE)
[![npm Downloads](https://img.shields.io/npm/dm/react-native-tdlib.svg?style=flat-square)](https://www.npmjs.com/package/react-native-tdlib)

⚠️ **Note:** This library is currently under development, and contributions are welcome! If you'd like to help improve the library, feel free to submit issues or pull requests.

`react-native-tdlib` is a React Native bridge for the [TDLib (Telegram Database Library)](https://github.com/tdlib/td) that allows developers to interact with Telegram's API seamlessly in their React Native applications.

## Installation

```bash
npm install react-native-tdlib
# or
yarn add react-native-tdlib
```
---

## Available Methods

The library provides the following methods for interacting with Telegram's TDLib. These are grouped into **Base API** and **High-Level API** for easier understanding.

---

### High-Level API

These methods simplify common tasks and abstract away low-level details.

| Method                 | Description                                                |
|------------------------|------------------------------------------------------------|
| **startTdLib**          | Starts the TDLib service with required parameters.         |
| **login**               | Initiates login with a phone number.                      |
| **verifyPhoneNumber**   | Verifies a phone number using an OTP code.                |
| **verifyPassword**      | Verifies the account password for two-factor authentication. |
| **getAuthorizationState** | Fetches the current authorization state.               |
| **getProfile**          | Retrieves the profile information of the logged-in user.  |
| **logout**              | Logs out of the current session.                          |

---

### Base API (Not recommended)

These methods offer low-level access to TDLib's functionalities.

| Method                 | Description                                                |
|------------------------|------------------------------------------------------------|
| **td_json_client_create** | Creates a new TDLib client instance.                     |
| **td_json_client_execute** | Synchronously executes a TDLib request.                |
| **td_json_client_send** | Sends a TDLib request asynchronously.                     |
| **td_json_client_receive** | Receives a TDLib response with a timeout.              |

---

### Example Usage

#### **High-Level API Example**
```javascript
// Start TDLib
await TdLib.startTdLib({
  api_id: 123456,
  api_hash: 'your_api_hash'
});

// Login with phone number
await TdLib.login({
  countrycode: '+1',
  phoneNumber: '1234567890'
});

// Verify phone number
await TdLib.verifyPhoneNumber('12345'); // Replace with the OTP you received

// Verify password (Optional)
await TdLib.verifyPassword('password');

// Get current profile
const profile = await TdLib.getProfile();
console.log(profile);
```

#### **Base API Example**
```javascript
const tdLibParameters = {
    '@type': 'setTdlibParameters',
    parameters: {
        database_directory: 'tdlib',
        use_message_database: true,
        use_secret_chats: true,
        api_id: 123456, // Replace with your API ID
        api_hash: 'your_api_hash', // Replace with your API Hash
        system_language_code: 'en',
        device_model: 'React Native',
        system_version: '1.0',
        application_version: '1.0',
        enable_storage_optimizer: true,
    },
};

// Send TDLib parameters
TdLib.td_json_client_send(tdLibParameters);
```
---
## Features
- Direct communication with TDLib for Telegram API interactions.
- Cross-platform support for iOS and Android.
- Easy-to-use methods for common TDLib operations, such as setting parameters, sending requests, and receiving updates.
---
## 📝 TODO
- [ ] **Move Prebuilt Library out of Repository**
- [ ] **Complete Android Method Implementations**
- [ ] **Improve Documentation**
- [ ] **Make a list of methods to implement**
---

## Example Project

This repository includes an example directory with a fully functional React Native project that demonstrates how to use the library. You can explore the example project to see how the library is integrated and used.

### Running the Example

1. Clone the repository:
```bash
git clone https://github.com/vladlenskiy/react-native-tdlib.git
cd react-native-tdlib/example
```
2. Install dependencies:
```bash
npm install
# or
yarn install
```

3.	Run the app:
```bash
npx react-native run-android   # For Android
npx react-native run-ios       # For iOS
```
