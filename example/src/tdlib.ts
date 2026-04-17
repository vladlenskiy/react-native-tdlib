/**
 * Shared TDLib wrapper — auth state subscription, event emitter setup,
 * safe request helpers.
 */

import {useEffect, useRef, useState} from 'react';
import {NativeEventEmitter, NativeModules} from 'react-native';
import TdLib, {TdLibParameters} from 'react-native-tdlib';

export const TDLIB_PARAMETERS: TdLibParameters = {
  api_id: 28439635,
  api_hash: '89c288441b3590f1e347dbdf28d9a8fe',
  device_model: 'React Native TDLib Demo',
  system_version: '1.0',
  application_version: '1.0',
  system_language_code: 'en',
};

export const tdEmitter = new NativeEventEmitter(NativeModules.TdLibModule);

export type AuthState =
  | 'loading'
  | 'wait_phone'
  | 'wait_code'
  | 'wait_password'
  | 'wait_registration'
  | 'wait_email'
  | 'ready'
  | 'closing'
  | 'closed'
  | 'unknown';

export interface AuthStateInfo {
  state: AuthState;
  phoneNumber?: string;
  codeType?: string;
  codeLength?: number;
  passwordHint?: string;
  hasRecoveryEmail?: boolean;
}

const STATE_MAP: Record<string, AuthState> = {
  authorizationStateWaitTdlibParameters: 'loading',
  authorizationStateWaitPhoneNumber: 'wait_phone',
  authorizationStateWaitCode: 'wait_code',
  authorizationStateWaitPassword: 'wait_password',
  authorizationStateWaitRegistration: 'wait_registration',
  authorizationStateWaitEmailAddress: 'wait_email',
  authorizationStateWaitEmailCode: 'wait_email',
  authorizationStateReady: 'ready',
  authorizationStateLoggingOut: 'loading',
  authorizationStateClosing: 'closing',
  authorizationStateClosed: 'closed',
};

function extractInfo(authState: any): AuthStateInfo {
  const type = authState?.['@type'] as string | undefined;
  const state = type ? STATE_MAP[type] ?? 'unknown' : 'unknown';

  const info: AuthStateInfo = {state};
  if (type === 'authorizationStateWaitCode') {
    const codeInfo = authState?.code_info ?? authState?.codeInfo;
    info.phoneNumber = codeInfo?.phone_number ?? codeInfo?.phoneNumber;
    const t = codeInfo?.type;
    info.codeType = t?.['@type'];
    info.codeLength = t?.length;
  }
  if (type === 'authorizationStateWaitPassword') {
    info.passwordHint = authState?.password_hint ?? authState?.passwordHint;
    info.hasRecoveryEmail =
      authState?.has_recovery_email_address ??
      authState?.hasRecoveryEmailAddress;
  }
  return info;
}

/**
 * Initialize TDLib once, then keep auth state info in sync with updates.
 * Auto-restarts TDLib after logout so the user can log in with a new account.
 */
export function useAuthState(): AuthStateInfo {
  const [info, setInfo] = useState<AuthStateInfo>({state: 'loading'});

  useEffect(() => {
    let mounted = true;
    let restartInFlight = false;

    const restartIfNeeded = async (state: AuthState) => {
      if (state !== 'closed' || restartInFlight) return;
      restartInFlight = true;
      try {
        await TdLib.startTdLib(TDLIB_PARAMETERS);
      } catch {
        // ignore
      } finally {
        restartInFlight = false;
      }
    };

    const apply = (newInfo: AuthStateInfo) => {
      if (!mounted) return;
      setInfo(newInfo);
      restartIfNeeded(newInfo.state);
    };

    const refresh = async () => {
      try {
        const r = await TdLib.getAuthorizationState();
        const parsed = JSON.parse(r);
        apply(extractInfo(parsed));
      } catch {
        if (mounted) setInfo({state: 'unknown'});
      }
    };

    const sub = tdEmitter.addListener('tdlib-update', event => {
      if (!event?.type?.startsWith('updateAuthorizationState')) return;
      try {
        const data = JSON.parse(event.raw);
        const inner = data?.authorization_state ?? data?.authorizationState;
        if (inner) apply(extractInfo(inner));
      } catch {
        refresh();
      }
    });

    (async () => {
      try {
        await TdLib.startTdLib(TDLIB_PARAMETERS);
      } catch {
        // already started — that's fine, we'll pick up current state below
      }
      refresh();
    })();

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return info;
}

/**
 * Subscribe to a specific update type (e.g. "updateNewMessage").
 * Handler is kept in a ref so the subscription doesn't churn on re-renders.
 */
export function useTdUpdate(
  typePrefix: string,
  handler: (data: any) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const sub = tdEmitter.addListener('tdlib-update', event => {
      if (!event?.type?.startsWith(typePrefix)) return;
      try {
        handlerRef.current(JSON.parse(event.raw));
      } catch {}
    });
    return () => sub.remove();
  }, [typePrefix]);
}

export function safeJsonParse<T = any>(s: string | null | undefined): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export {default as TdLib} from 'react-native-tdlib';
