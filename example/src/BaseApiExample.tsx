/**
 * Base Methods Example
 */

import React, {useCallback, useEffect} from 'react';
import {Button, SafeAreaView, StyleSheet} from 'react-native';
import TdLib from 'react-native-tdlib';

const parameters = {
  database_directory: 'tdlib',
  use_message_database: true,
  use_secret_chats: true,
  api_id: 123456, // Your API ID
  api_hash: '123456', // Your API Hash
  system_language_code: 'en',
  device_model: 'React Native',
  system_version: '1.0',
  application_version: '1.0',
  enable_storage_optimizer: true,
  use_file_database: true,
};

const BaseApiExample = () => {
  let client = null as any;

  /**
   * Initializes the TDLib client if not already initialized.
   */
  const initializeTdLibClient = useCallback(async () => {
    try {
      if (!client) {
        client = await TdLib.td_json_client_create();
        console.log('TDLib client created successfully');
      } else {
        console.log('TDLib client already initialized');
      }
      return client;
    } catch (error) {
      console.error('Error initializing TDLib client:', error);
      throw error;
    }
  }, [client]);

  /**
   * Sets the necessary parameters for TDLib to function properly.
   */
  const setTdLibParameters = useCallback(async () => {
    try {
      if (!client) {
        throw new Error(
          'TDLib client not initialized. Call initializeTdLibClient first.',
        );
      }

      // TDLib configuration parameters
      const tdLibParameters = {
        '@type': 'setTdlibParameters',
        parameters,
      };

      TdLib.td_json_client_send(tdLibParameters);
    } catch (error) {
      console.error('Error setting TDLib parameters:', error.message);
      throw error;
    }
  }, [client]);

  /**
   * Combines initialization of the TDLib client and setting its parameters.
   */
  const initializeTdLib = async () => {
    try {
      await initializeTdLibClient();
      await setTdLibParameters();
      console.log('TDLib initialized successfully');
    } catch (error) {
      console.error('Error initializing TDLib:', error.message);
    }
  };

  /**
   * Closes the TDLib client to release resources.
   */
  const closeTdLibClient = useCallback(async () => {
    if (client) {
      TdLib.td_json_client_send({
        '@type': 'close',
      });
      client = null;
      console.log('TDLib client closed');
    }
  }, [client]);

  useEffect(() => {
    initializeTdLib();

    return () => {
      closeTdLibClient();
    };
  }, []);

  /**
   * Sends the phone number to TDLib for authentication.
   */
  const sendCode = useCallback(() => {
    const phoneRequest = {
      '@type': 'setAuthenticationPhoneNumber',
      phone_number: '+12345678', // Your Telegram phone number
    };

    TdLib.td_json_client_send(phoneRequest);
  }, []);

  /**
   * Sets the localization target option for TDLib.
   */
  const setLocalizationTargetOption = async () => {
    const request = {
      '@type': 'setOption',
      name: 'localization_target',
      value: {
        '@type': 'optionValueString',
        value: 'ios', // or 'android', depending on the platform
      },
    };

    TdLib.td_json_client_send(request);
  };

  /**
   * Fetches the list of supported languages from TDLib.
   */
  const fetchSupportedLanguages = async () => {
    try {
      await setLocalizationTargetOption();

      const request = {
        '@type': 'getLocalizationTargetInfo',
        only_locales: true,
      };
      TdLib.td_json_client_send(request);

      while (true) {
        const response = await TdLib.td_json_client_receive();
        if (response) {
          const parsedResponse = JSON.parse(response);

          if (parsedResponse['@type'] === 'localizationTargetInfo') {
            console.log('Supported languages:', parsedResponse);
            return parsedResponse;
          }

          if (parsedResponse['@type'] === 'error') {
            throw new Error(
              `Error fetching supported languages: ${parsedResponse.message}`,
            );
          }
        } else {
          throw new Error('No response from TDLib');
        }
      }
    } catch (error) {
      console.error('Error in fetchSupportedLanguages:', error);
      throw error;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Button title={'Send Code'} onPress={sendCode} />
      <Button title={'Get Supported Langs'} onPress={fetchSupportedLanguages} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    flex: 1,
  },
});

export default BaseApiExample;
