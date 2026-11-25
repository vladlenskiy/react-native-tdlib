// Entry screen for the fresh-app CI check (.github/workflows/integration.yml).
// It is copied over App.tsx of a newly generated React Native app that
// installs react-native-tdlib from `npm pack`. The run scripts read the
// TDLIB_CHECK_RESULT line from the device log.
//
// 1. getTextEntities runs inside TDLib without a login: proves the native
//    library loads and answers.
// 2. When tdlib-credentials.json holds an api_id/api_hash, the app also logs
//    in to Telegram's test DC with a throwaway 99966XYYYY number and calls
//    getSupergroup with an id above 2^31. A bridge that truncates the id to
//    32 bits makes TDLib answer "Invalid supergroup identifier"; a correct
//    one gets "Supergroup not found".
import React, {useEffect, useState} from 'react';
import {NativeEventEmitter, NativeModules, ScrollView, Text, View} from 'react-native';
import TdLib from 'react-native-tdlib';

const credentials: {api_id?: string | number; api_hash?: string} = require('./tdlib-credentials.json');

const SAMPLE = 'Hi @telegram see https://t.me #tdlib';
const EXPECTED = [
  'textEntityTypeMention',
  'textEntityTypeUrl',
  'textEntityTypeHashtag',
];
const TEST_DC = 2;
const LARGE_SUPERGROUP_ID = 3000000000;

async function checkTextEntities(): Promise<string> {
  if (TdLib == null || typeof TdLib.getTextEntities !== 'function') {
    throw new Error('native module is not linked');
  }
  const raw = await TdLib.getTextEntities(SAMPLE);
  const parsed = JSON.parse(String(raw));
  const types: string[] = (parsed.entities ?? []).map((e: any) => e?.type?.['@type']);
  if (parsed['@type'] !== 'textEntities' || types.join() !== EXPECTED.join()) {
    throw new Error(`unexpected getTextEntities result ${String(raw).slice(0, 300)}`);
  }
  return `methods=${Object.keys(TdLib).length} entities=${types.join(',')}`;
}

function logInToTestDc(log: (s: string) => void): Promise<void> {
  const emitter = new NativeEventEmitter(NativeModules.TdLibModule);
  const phone = `${TEST_DC}${Math.floor(1000 + Math.random() * 9000)}`;
  const handled = new Set<string>();

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.remove();
      reject(new Error('timed out waiting for authorizationStateReady'));
    }, 180000);
    const finish = (err?: Error) => {
      clearTimeout(timer);
      sub.remove();
      err ? reject(err) : resolve();
    };

    const onState = async (state: string) => {
      if (handled.has(state)) return;
      handled.add(state);
      log(`auth state ${state}`);
      try {
        if (state === 'authorizationStateWaitPhoneNumber') {
          await TdLib.login({countrycode: '99966', phoneNumber: phone});
        } else if (state === 'authorizationStateWaitCode') {
          await TdLib.verifyPhoneNumber(String(TEST_DC).repeat(5));
        } else if (state === 'authorizationStateWaitRegistration') {
          await TdLib.td_json_client_send({
            '@type': 'registerUser',
            first_name: 'CI',
            last_name: 'Check',
            disable_notification: true,
          });
        } else if (state === 'authorizationStateReady') {
          finish();
        } else if (
          state === 'authorizationStateWaitPassword' ||
          state === 'authorizationStateClosed'
        ) {
          finish(new Error(`unexpected auth state ${state}`));
        }
      } catch (e: any) {
        finish(new Error(`${state}: ${e?.message ?? e}`));
      }
    };

    const sub = emitter.addListener('tdlib-update', (event: any) => {
      if (!event?.type?.startsWith('updateAuthorizationState')) return;
      try {
        const data = JSON.parse(event.raw);
        const inner = data?.authorization_state ?? data?.authorizationState;
        if (inner?.['@type']) onState(inner['@type']);
      } catch {}
    });

    TdLib.startTdLib({
      api_id: Number(credentials.api_id),
      api_hash: String(credentials.api_hash),
      use_test_dc: true,
    })
      .then(() => TdLib.getAuthorizationState())
      .then((r: string) => {
        const t = JSON.parse(r)?.['@type'];
        if (t) onState(t);
      })
      .catch((e: any) => finish(new Error(`startTdLib: ${e?.message ?? e}`)));
  });
}

async function checkLargeSupergroupId(log: (s: string) => void): Promise<string> {
  if (!credentials.api_id || !credentials.api_hash) {
    return 'auth=SKIP(no test DC credentials)';
  }
  await logInToTestDc(log);
  let message: string;
  try {
    const res: any = await TdLib.getSupergroup(LARGE_SUPERGROUP_ID);
    const parsed = JSON.parse(String(res?.raw ?? res));
    message = parsed['@type'] === 'error' ? parsed.message : parsed['@type'];
  } catch (e: any) {
    message = String(e?.message ?? e);
  }
  if (message !== 'Supergroup not found' && message !== 'supergroup') {
    throw new Error(`getSupergroup(${LARGE_SUPERGROUP_ID}) -> ${message}`);
  }
  return `auth=PASS(getSupergroup ${LARGE_SUPERGROUP_ID} -> ${message})`;
}

export default function App() {
  const [lines, setLines] = useState<string[]>(['running']);

  useEffect(() => {
    const out: string[] = [];
    const log = (s: string) => {
      out.push(s);
      setLines([...out]);
    };
    (async () => {
      const parts = [await checkTextEntities()];
      parts.push(await checkLargeSupergroupId(log));
      return `PASS ${parts.join(' ')}`;
    })()
      .catch((e: any) => `FAIL ${e?.code ?? ''} ${e?.message ?? e}`.trim())
      .then(r => {
        console.log(`TDLIB_CHECK_RESULT ${r}`);
        log(r);
      });
  }, []);

  return (
    <View style={{flex: 1, backgroundColor: 'white', paddingTop: 80}}>
      <ScrollView contentContainerStyle={{padding: 16}}>
        <Text style={{fontSize: 18, fontWeight: '600'}}>TDLib check</Text>
        {lines.map((l, i) => (
          <Text key={i} style={{marginTop: 6}}>
            {l}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
