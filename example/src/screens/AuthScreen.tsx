/**
 * Auth wizard — sequential Telegram-like login flow.
 * Step is driven by the current TDLib authorization state.
 */

import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import TdLib from 'react-native-tdlib';
import {colors} from '../theme';
import {AuthStateInfo} from '../tdlib';

interface Props {
  info: AuthStateInfo;
}

const AuthScreen: React.FC<Props> = ({info}) => {
  const [countryCode, setCountryCode] = useState('+7');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendPhone = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await TdLib.login({countrycode: countryCode, phoneNumber: phone});
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, [countryCode, phone]);

  const sendCode = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await TdLib.verifyPhoneNumber(code);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, [code]);

  const sendPassword = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await TdLib.verifyPassword(password);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, [password]);

  const startOver = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await TdLib.logout();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  if (
    info.state === 'loading' ||
    info.state === 'closing' ||
    info.state === 'closed' ||
    info.state === 'unknown'
  ) {
    const label =
      info.state === 'closing' || info.state === 'closed'
        ? 'Signing out…'
        : 'Starting TDLib…';
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loading}>{label}</Text>
      </View>
    );
  }

  const codeHint = codeTypeLabel(info.codeType);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <View style={styles.logoBlock}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>TG</Text>
        </View>
        <Text style={styles.title}>
          {info.state === 'wait_phone' && 'Your phone number'}
          {info.state === 'wait_code' && `Enter ${codeHint}`}
          {info.state === 'wait_password' && 'Two-factor authentication'}
          {info.state === 'wait_registration' && 'Complete registration'}
          {info.state === 'wait_email' && 'Email confirmation'}
        </Text>
        <Text style={styles.subtitle}>
          {info.state === 'wait_phone' &&
            'Please confirm your country code and enter your phone number.'}
          {info.state === 'wait_code' &&
            (info.phoneNumber
              ? `We sent a code to +${info.phoneNumber.replace(/^\+/, '')}.`
              : 'Enter the code we sent you.')}
          {info.state === 'wait_password' &&
            (info.passwordHint
              ? `Hint: ${info.passwordHint}`
              : 'Your account is protected with an additional password.')}
          {info.state === 'wait_registration' &&
            'This phone is not registered. Please register via the Telegram app first.'}
          {info.state === 'wait_email' && 'Enter the code sent to your email.'}
        </Text>
      </View>

      {info.state === 'wait_phone' && (
        <View style={styles.form}>
          <View style={styles.phoneRow}>
            <TextInput
              value={countryCode}
              onChangeText={setCountryCode}
              placeholder="+7"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              style={[styles.input, styles.country]}
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              style={[styles.input, styles.phone]}
              autoFocus
            />
          </View>
          <Button label="Next" onPress={sendPhone} disabled={busy || !phone} />
        </View>
      )}

      {info.state === 'wait_code' && (
        <View style={styles.form}>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Code"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            style={[styles.input, styles.inputSpaced]}
            autoFocus
          />
          <Button
            label="Verify"
            onPress={sendCode}
            disabled={busy || (info.codeLength ? code.length < info.codeLength : code.length < 4)}
          />
          <TextButton label="Use a different phone" onPress={startOver} disabled={busy} />
        </View>
      )}

      {info.state === 'wait_password' && (
        <View style={styles.form}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            style={[styles.input, styles.inputSpaced]}
            autoFocus
          />
          <Button
            label="Continue"
            onPress={sendPassword}
            disabled={busy || !password}
          />
          <TextButton label="Log out and restart" onPress={startOver} disabled={busy} />
        </View>
      )}

      {info.state === 'wait_registration' && (
        <View style={styles.form}>
          <TextButton label="Log out and try a different phone" onPress={startOver} disabled={busy} />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {busy && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
    </KeyboardAvoidingView>
  );
};

function codeTypeLabel(type: string | undefined): string {
  switch (type) {
    case 'authenticationCodeTypeSms':
    case 'authenticationCodeTypeSmsWord':
    case 'authenticationCodeTypeSmsPhrase':
      return 'SMS code';
    case 'authenticationCodeTypeCall':
      return 'call code';
    case 'authenticationCodeTypeFlashCall':
      return 'flash call code';
    case 'authenticationCodeTypeMissedCall':
      return 'missed call code';
    case 'authenticationCodeTypeTelegramMessage':
      return 'Telegram code';
    case 'authenticationCodeTypeFragment':
      return 'Fragment code';
    case 'authenticationCodeTypeFirebaseAndroid':
    case 'authenticationCodeTypeFirebaseIos':
      return 'Firebase code';
    default:
      return 'code';
  }
}

const Button: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({label, onPress, disabled}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[styles.button, disabled && styles.buttonDisabled]}
    activeOpacity={0.8}>
    <Text style={styles.buttonText}>{label}</Text>
  </TouchableOpacity>
);

const TextButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({label, onPress, disabled}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={styles.textBtn}
    activeOpacity={0.5}>
    <Text style={[styles.textBtnLabel, disabled && styles.textBtnDisabled]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, paddingHorizontal: 20},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loading: {marginTop: 14, color: colors.textSecondary, fontSize: 14},
  logoBlock: {alignItems: 'center', marginTop: 64, marginBottom: 40},
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoText: {color: 'white', fontSize: 34, fontWeight: '700'},
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  form: {},
  phoneRow: {flexDirection: 'row', marginBottom: 14},
  country: {width: 80, textAlign: 'center', marginRight: 10},
  phone: {flex: 1},
  input: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  inputSpaced: {marginBottom: 14},
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {backgroundColor: colors.divider},
  buttonText: {color: 'white', fontSize: 16, fontWeight: '600'},
  textBtn: {alignItems: 'center', paddingVertical: 14, marginTop: 8},
  textBtnLabel: {color: colors.primary, fontSize: 14, fontWeight: '500'},
  textBtnDisabled: {color: colors.textTertiary},
  error: {
    marginTop: 16,
    color: colors.danger,
    textAlign: 'center',
    fontSize: 13,
  },
  spinner: {marginTop: 16},
});

export default AuthScreen;
