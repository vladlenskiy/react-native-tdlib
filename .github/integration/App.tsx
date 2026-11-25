// Entry screen for the fresh-app CI check (.github/workflows/integration.yml).
// It is copied over App.tsx of a newly generated React Native app that
// installs react-native-tdlib from `npm pack`. The run scripts read the
// TDLIB_CHECK_RESULT line from the device log.
//
// 1. getTextEntities runs inside TDLib without a login: proves the native
//    library loads and answers.
// 2. When tdlib-credentials.json holds an api_id/api_hash, the app also logs
//    in to Telegram's test DC with a throwaway 99966XYYYY number, creates a
//    supergroup and reads it back with getSupergroup. The check fails unless
//    the returned id equals the requested one, so a bridge that narrows the
//    id to 32 bits (Java clamps to 2147483647, C may wrap) is caught whenever
//    the new id is above 2^31. The result line says whether it was.
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
const INT32_MAX = 2147483647;

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
  // Not a secret: test-DC numbers only need to vary between runs to dodge
  // per-number flood limits.
  const phone = `${TEST_DC}${1000 + (Date.now() % 9000)}`;
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

function createSupergroup(log: (s: string) => void): Promise<number> {
  const emitter = new NativeEventEmitter(NativeModules.TdLibModule);
  const title = `CI check ${Date.now()}`;
  return new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.remove();
      reject(new Error('timed out waiting for the new supergroup'));
    }, 60000);
    // The chat title identifies our group among any other updates.
    const sub = emitter.addListener('tdlib-update', (event: any) => {
      if (event?.type !== 'updateNewChat') return;
      try {
        const chat = JSON.parse(event.raw)?.chat;
        if (chat?.title !== title || chat?.type?.['@type'] !== 'chatTypeSupergroup') return;
        clearTimeout(timer);
        sub.remove();
        resolve(Number(chat.type.supergroup_id));
      } catch {}
    });
    log(`creating supergroup "${title}"`);
    TdLib.td_json_client_send({
      '@type': 'createNewSupergroupChat',
      title,
      is_forum: false,
      is_channel: false,
      description: '',
      message_auto_delete_time: 0,
      for_import: false,
    }).catch((e: any) => {
      clearTimeout(timer);
      sub.remove();
      reject(new Error(`createNewSupergroupChat: ${e?.message ?? e}`));
    });
  });
}

async function checkSupergroupRoundTrip(log: (s: string) => void): Promise<string> {
  if (!credentials.api_id || !credentials.api_hash) {
    return 'auth=SKIP(no test DC credentials)';
  }
  await logInToTestDc(log);
  const id = await createSupergroup(log);
  const res: any = await TdLib.getSupergroup(id);
  const parsed = JSON.parse(String(res?.raw ?? res));
  if (parsed?.['@type'] !== 'supergroup' || Number(parsed.id) !== id) {
    throw new Error(`getSupergroup(${id}) -> ${String(res?.raw ?? res).slice(0, 200)}`);
  }
  const overflow = id > INT32_MAX ? 'id above 2^31' : 'id below 2^31, 64-bit path not exercised';
  return `auth=PASS(getSupergroup ${id} round-trip, ${overflow})`;
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
      parts.push(await checkSupergroupRoundTrip(log));
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
