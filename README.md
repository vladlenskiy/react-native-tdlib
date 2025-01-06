# react-native-tdlib

`react-native-tdlib` is a React Native library that provides access to Telegram TDLib for working with Telegram API. TDLib is the official Telegram library used for interacting with Telegram servers.

## Features

- Full support for Telegram API.
- Compatibility with both Android and iOS.
- Asynchronous execution of TDLib methods.
- Easy integration with React Native projects.

## Installation

### 1. Install the package

Add the library to your project:

```bash
npm install react-native-tdlib
# or
yarn add react-native-tdlib

2. Link the library

React Native should automatically link the library. If it does not, manually link the library:

iOS

Run the following command:

cd ios && pod install

Android

Ensure that the library is included in your settings.gradle and app/build.gradle files.

3. Configure TDLib binaries

Download and integrate TDLib binaries for both Android and iOS as per the official TDLib documentation. Make sure the libtdjson and other dependencies are correctly added to your project.

Usage

Import the library

import TdLibModule from 'react-native-tdlib';

Example: Initialize and start TDLib

import TdLibModule from 'react-native-tdlib';

TdLibModule.startTdLib({
  apiId: 'YOUR_API_ID',
  apiHash: 'YOUR_API_HASH',
  useTestDc: false, // Set to true for testing
}).then(() => {
  console.log('TDLib started successfully');
}).catch((error) => {
  console.error('Failed to start TDLib:', error);
});

Example: Login

TdLibModule.login({
  phoneNumber: '+1234567890',
}).then(() => {
  console.log('Login initiated');
}).catch((error) => {
  console.error('Login error:', error);
});

Example: Fetch user profile

TdLibModule.getProfile()
  .then((profile) => {
    console.log('User profile:', profile);
  })
  .catch((error) => {
    console.error('Failed to get profile:', error);
  });

API

Base API
	•	td_json_client_create: Creates a new TDLib client.
	•	td_json_client_execute: Executes a TDLib function synchronously.
	•	td_json_client_send: Sends an asynchronous request to TDLib.
	•	td_json_client_receive: Waits for TDLib responses.

High-Level API
	•	startTdLib: Starts the TDLib service.
	•	login: Initiates the login process.
	•	verifyPhoneNumber: Verifies the phone number.
	•	verifyPassword: Verifies the user’s password.
	•	getProfile: Fetches the user profile.
	•	getAuthorizationState: Retrieves the current authorization state.
	•	logout: Logs out the user.

Troubleshooting

1. Error: TdLibModule not linked

Make sure the library is correctly linked. For iOS, run pod install in the ios directory. For Android, verify that the library is included in your settings.gradle and app/build.gradle files.

2. Error: No response from TDLib

Ensure TDLib is properly initialized and running. Verify your apiId, apiHash, and other configuration parameters.

3. Invariant Violation: Failed to call into JavaScript module

Ensure that react-native-tdlib is correctly imported and linked. Check your project dependencies and rebuild the project.

Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

License

This project is licensed under the MIT License. See the LICENSE file for details.

