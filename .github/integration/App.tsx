// Entry screen for the fresh-app CI check (.github/workflows/integration.yml).
// It is copied over App.tsx of a newly generated React Native app that
// installs react-native-tdlib from `npm pack`. The run scripts read the
// TDLIB_CHECK_RESULT line from the device log.
import React, {useEffect, useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import TdLib from 'react-native-tdlib';

const SAMPLE = 'Hi @telegram see https://t.me #tdlib';
const EXPECTED = [
  'textEntityTypeMention',
  'textEntityTypeUrl',
  'textEntityTypeHashtag',
];

async function runChecks(): Promise<string> {
  if (TdLib == null || typeof TdLib.getTextEntities !== 'function') {
    return 'FAIL native module is not linked';
  }
  const methods = Object.keys(TdLib).length;
  const raw = await TdLib.getTextEntities(SAMPLE);
  const parsed = JSON.parse(String(raw));
  const types: string[] = (parsed.entities ?? []).map(
    (e: any) => e?.type?.['@type'],
  );
  if (parsed['@type'] !== 'textEntities' || types.join() !== EXPECTED.join()) {
    return `FAIL unexpected getTextEntities result ${String(raw).slice(0, 300)}`;
  }
  return `PASS methods=${methods} entities=${types.join(',')}`;
}

export default function App() {
  const [result, setResult] = useState('running');

  useEffect(() => {
    runChecks()
      .catch(e => `FAIL ${e?.code ?? ''} ${e?.message ?? e}`)
      .then(r => {
        console.log(`TDLIB_CHECK_RESULT ${r}`);
        setResult(r);
      });
  }, []);

  return (
    <View style={{flex: 1, backgroundColor: 'white', paddingTop: 80}}>
      <ScrollView contentContainerStyle={{padding: 16}}>
        <Text style={{fontSize: 18, fontWeight: '600'}}>TDLib check</Text>
        <Text style={{marginTop: 8}}>{result}</Text>
      </ScrollView>
    </View>
  );
}
