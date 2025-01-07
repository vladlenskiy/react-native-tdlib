/**
 * This examples in progress
 */

import React, {useCallback, useEffect} from 'react';
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import TdLib, {TdLibParameters} from 'react-native-tdlib';

const parameters = {
  api_id: 12345678, // Your API ID
  api_hash: '12345678', // Your API Hash
} as TdLibParameters;

const HighLevelApiExample = () => {
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [countryCode, setCountryCode] = React.useState('');
  const [profile, setProfile] = React.useState<any>(null);

  useEffect(() => {
    // Initializes TDLib with the provided parameters and checks the authorization state
    TdLib.startTdLib(parameters).then(r => {
      console.log('StartTdLib:', r);
      TdLib.getAuthorizationState().then(r => {
        console.log('InitialAuthState:', r);
        if (JSON.parse(r)['@type'] === 'authorizationStateReady') {
          getProfile(); // Fetches the user's profile if authorization is ready
        }
      });
    });
  }, []);

  // Sends a verification code to the provided phone number
  const sendCode = useCallback(() => {
    TdLib.login({countrycode: countryCode, phoneNumber: phone}).then(r =>
      console.log('SendCode:', r),
    );
  }, [countryCode, phone]);

  // Verifies the phone number using the entered OTP code
  const verifyPhoneNumber = useCallback(() => {
    TdLib.verifyPhoneNumber(otp).then(r =>
      console.log('VerifyPhoneNumber:', r),
    );
  }, [otp]);

  // Verifies the password if required for login
  const checkPassword = useCallback(() => {
    TdLib.verifyPassword(password).then(r => console.log('CheckPassword:', r));
  }, [password]);

  // Fetches the profile of the logged-in user
  const getProfile = useCallback(() => {
    TdLib.getProfile().then(result => {
      console.log('User Profile:', result);
      const profile = Platform.select({
        ios: result,
        android: JSON.parse(result),
      });
      setProfile(profile);
    });
  }, []);

  const checkAuthState = useCallback(() => {
    TdLib.getAuthorizationState().then(r => console.log('AuthState:', r));
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Auth</Text>
        <Text>1. Login</Text>
        <TextInput
          value={countryCode}
          onChangeText={setCountryCode}
          placeholder={'+90'}
          placeholderTextColor={'gray'}
          style={[
            styles.input,
            {
              marginBottom: 10,
              marginTop: 14,
            },
          ]}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder={'1234567890'}
          placeholderTextColor={'gray'}
          style={styles.input}
        />
        <Button title={'Send Code'} onPress={sendCode} />
        <View style={styles.divider} />
        <Text>2. OTP code</Text>
        <TextInput
          value={otp}
          onChangeText={setOtp}
          placeholder={'1234'}
          placeholderTextColor={'gray'}
          style={[
            styles.input,
            {
              marginVertical: 14,
            },
          ]}
        />
        <Button title={'Login'} onPress={verifyPhoneNumber} />
        <View style={styles.divider} />
        <Text>3. Password (optional)</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={'123456'}
          placeholderTextColor={'gray'}
          style={[
            styles.input,
            {
              marginVertical: 14,
            },
          ]}
        />
        <Button title={'Login'} onPress={checkPassword} />
        <View style={styles.divider} />
        {profile && (
          <>
            <Text>
              Name: {profile.first_name || profile.firstName}{' '}
              {profile.last_name || profile.lastName}
            </Text>
            <Text>
              Phone Number: {profile.phone_number || profile.phoneNumber}
            </Text>
          </>
        )}
        <Button title={'Get Profile'} onPress={getProfile} />
        <Button title={'Get Auth State'} onPress={checkAuthState} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    flex: 1,
  },
  contentContainer: {
    paddingTop: 20,
    paddingHorizontal: 8,
  },
  title: {fontSize: 18, alignSelf: 'center', marginBottom: 10},
  input: {padding: 6, borderRadius: 10, borderWidth: 1, height: 40},
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: 'black',
    marginVertical: 14,
  },
});

export default HighLevelApiExample;
