/**
 * Methods Test Screen — exercises every method in the TdLib bridge.
 *
 * Two modes:
 *  - Safe: read-only calls only. Run "Run Safe Tests" to sweep most of the API.
 *  - Destructive: writes (sendMessage, addComment, setOption, etc.). Each has its own button.
 *
 * Requirements: user must be authenticated on the Auth tab first.
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Button,
  NativeEventEmitter,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import TdLib from 'react-native-tdlib';

type Status = 'pending' | 'running' | 'pass' | 'fail' | 'skip';

interface TestResult {
  name: string;
  status: Status;
  message?: string;
  durationMs?: number;
}

const safeMethods = [
  'td_json_client_execute',
  'getAuthorizationState',
  'getProfile',
  'getOption',
  'loadChats',
  'getChats',
  'searchChats',
  'searchPublicChat',
  'getChat',
  'openChat',
  'closeChat',
  'getChatHistory',
  'viewMessages',
  'getMessage',
  'getMessagesCompat',
  'getMessageThread',
  'getMessageThreadHistory',
  'getChatMessagePosition',
  'getAddedReactions',
  'getUserProfile',
  'getUserFull',
  'getUserProfilePhotos',
  'getUsersCompat',
  'getChatMember',
  'getSupergroup',
  'getFile',
  'downloadFile',
  'downloadFileByRemoteId',
  'cancelDownloadFile',
  'cancelDownloadByRemoteId',
  'createPrivateChat',
  'echoToJs',
  'addListener',
  'removeListeners',
];

const destructiveMethods = [
  'sendMessage',
  'setOption',
  'addMessageReaction',
  'removeMessageReaction',
  'addComment',
  'deleteComment',
  'joinChat',
  'leaveChat',
  'verifyPhoneNumber',
  'verifyPassword',
  'login',
  'startTdLib',
  'logout',
  'destroy',
  'td_json_client_create',
  'td_json_client_send',
  'td_json_client_receive',
];

const tdlibModule = NativeModules.TdLibModule;
const eventEmitter = new NativeEventEmitter(tdlibModule);

const MethodsTestExample: React.FC = () => {
  const [results, setResults] = useState<Record<string, TestResult>>(() => {
    const init: Record<string, TestResult> = {};
    [...safeMethods, ...destructiveMethods].forEach(m => {
      init[m] = {name: m, status: 'pending'};
    });
    return init;
  });
  const [authOk, setAuthOk] = useState(false);
  const [authState, setAuthState] = useState('...');
  const [eventsSeen, setEventsSeen] = useState(0);
  const [sampleChatId, setSampleChatId] = useState<string>('');
  const [sampleMessageId, setSampleMessageId] = useState<string>('');
  const [sampleUserId, setSampleUserId] = useState<string>('');
  const [testMessageText, setTestMessageText] = useState('Hello from test');
  const [log, setLog] = useState<string[]>([]);

  const discoveredRef = useRef<{
    chatId?: number;
    messageId?: number;
    userId?: number;
    fileId?: number;
  }>({});

  const appendLog = useCallback((line: string) => {
    setLog(prev => [line, ...prev.slice(0, 99)]);
  }, []);

  const setResult = useCallback((name: string, r: Partial<TestResult>) => {
    setResults(prev => ({...prev, [name]: {...prev[name], ...r, name}}));
  }, []);

  useEffect(() => {
    const sub = eventEmitter.addListener('tdlib-update', _e => {
      setEventsSeen(n => n + 1);
    });
    TdLib.getAuthorizationState()
      .then(r => {
        const type = JSON.parse(r)['@type'];
        setAuthState(type);
        setAuthOk(type === 'authorizationStateReady');
      })
      .catch(e => setAuthState(`err: ${e.message}`));
    return () => sub.remove();
  }, []);

  const run = useCallback(
    async (name: string, fn: () => Promise<unknown>, opts?: {skipReason?: string}) => {
      if (opts?.skipReason) {
        setResult(name, {status: 'skip', message: opts.skipReason});
        return;
      }
      setResult(name, {status: 'running'});
      const t0 = Date.now();
      try {
        const out = await fn();
        const durationMs = Date.now() - t0;
        const preview =
          typeof out === 'string'
            ? out.slice(0, 80)
            : JSON.stringify(out ?? null).slice(0, 80);
        setResult(name, {status: 'pass', message: preview, durationMs});
        appendLog(`✓ ${name} (${durationMs}ms): ${preview}`);
      } catch (e: any) {
        const durationMs = Date.now() - t0;
        setResult(name, {
          status: 'fail',
          message: e?.message ?? String(e),
          durationMs,
        });
        appendLog(`✗ ${name} (${durationMs}ms): ${e?.message ?? e}`);
      }
    },
    [appendLog, setResult],
  );

  const runSafeTests = useCallback(async () => {
    if (!authOk) {
      appendLog('⚠ Not authorized. Go to Auth tab first.');
      return;
    }

    // Event emitter scaffolding
    await run('addListener', async () => {
      TdLib.addListener('tdlib-update');
      return 'registered';
    });
    await run('removeListeners', async () => {
      TdLib.removeListeners(0);
      return 'ok';
    });
    await run('echoToJs', async () => {
      TdLib.echoToJs({hello: 'world'});
      return 'emitted';
    });

    // Base API: execute is always safe (synchronous, no client needed for some reqs)
    await run('td_json_client_execute', () =>
      TdLib.td_json_client_execute({
        '@type': 'getTextEntities',
        text: '@telegram /test_command https://telegram.org #test',
      }),
    );

    // High-level basics
    await run('getAuthorizationState', () => TdLib.getAuthorizationState());
    await run('getProfile', async () => {
      const r = await TdLib.getProfile();
      const me = JSON.parse(r);
      if (me.id) {
        discoveredRef.current.userId = me.id;
        setSampleUserId(String(me.id));
      }
      return r;
    });

    // Options
    await run('getOption', () => TdLib.getOption('version'));

    // Chat list
    await run('loadChats', () => TdLib.loadChats(20));
    await run('getChats', async () => {
      const r = await TdLib.getChats(20);
      const arr = JSON.parse(r);
      if (arr.length) {
        discoveredRef.current.chatId = arr[0].id;
        setSampleChatId(String(arr[0].id));
      }
      return `${arr.length} chats`;
    });

    await run('searchChats', () => TdLib.searchChats('', 10));
    await run('searchPublicChat', () => TdLib.searchPublicChat('telegram'));

    const cid = discoveredRef.current.chatId;
    if (cid) {
      await run('getChat', () => TdLib.getChat(cid));
      await run('openChat', async () => {
        const r = await TdLib.openChat(cid);
        return r;
      });
      await run('getChatHistory', async () => {
        const hist = await TdLib.getChatHistory(cid, 0, 20, 0);
        if (hist.length) {
          const first = JSON.parse(hist[0].raw_json);
          if (first.id) {
            discoveredRef.current.messageId = first.id;
            setSampleMessageId(String(first.id));
          }
        }
        return `${hist.length} messages`;
      });
      await run('viewMessages', async () => {
        const mid = discoveredRef.current.messageId;
        if (!mid) return 'no message';
        return TdLib.viewMessages(cid, [mid], false);
      });
      await run('getMessage', async () => {
        const mid = discoveredRef.current.messageId;
        if (!mid) {
          throw new Error('no discovered messageId');
        }
        return TdLib.getMessage(cid, mid);
      });
      await run('getMessagesCompat', async () => {
        const mid = discoveredRef.current.messageId;
        if (!mid) {
          throw new Error('no discovered messageId');
        }
        return TdLib.getMessagesCompat(cid, [mid]);
      });
      await run('getChatMessagePosition', async () => {
        const mid = discoveredRef.current.messageId;
        if (!mid) {
          throw new Error('no discovered messageId');
        }
        return TdLib.getChatMessagePosition(cid, mid, 0);
      });
      await run('getMessageThread', async () => {
        const mid = discoveredRef.current.messageId;
        if (!mid) {
          throw new Error('no discovered messageId');
        }
        return TdLib.getMessageThread(cid, mid);
      });
      await run('getMessageThreadHistory', async () => {
        const mid = discoveredRef.current.messageId;
        if (!mid) {
          throw new Error('no discovered messageId');
        }
        return TdLib.getMessageThreadHistory(cid, mid, 0, 0, 20);
      });
      await run('getAddedReactions', async () => {
        const mid = discoveredRef.current.messageId;
        if (!mid) {
          throw new Error('no discovered messageId');
        }
        return TdLib.getAddedReactions(cid, mid);
      });
      await run('closeChat', () => TdLib.closeChat(cid));

      // Chat member / supergroup probing
      const me = discoveredRef.current.userId;
      if (me) {
        await run('getChatMember', () => TdLib.getChatMember(cid, me));
      } else {
        setResult('getChatMember', {
          status: 'skip',
          message: 'no discovered userId',
        });
      }

      const chatJson = await TdLib.getChat(cid).catch(() => null);
      let supergroupId = 0;
      if (chatJson) {
        try {
          const chat = JSON.parse(chatJson.raw);
          if (chat?.type?._ === 'chatTypeSupergroup' || chat?.type?.['@type'] === 'chatTypeSupergroup') {
            supergroupId = chat.type.supergroup_id ?? chat.type.supergroupId ?? 0;
          }
        } catch {}
      }
      if (supergroupId) {
        await run('getSupergroup', () => TdLib.getSupergroup(supergroupId));
      } else {
        setResult('getSupergroup', {
          status: 'skip',
          message: 'no supergroup chat found; run Destructive/Manual',
        });
      }
    } else {
      const chatDependent = [
        'getChat',
        'openChat',
        'closeChat',
        'getChatHistory',
        'viewMessages',
        'getMessage',
        'getMessagesCompat',
        'getChatMessagePosition',
        'getMessageThread',
        'getMessageThreadHistory',
        'getAddedReactions',
        'getChatMember',
        'getSupergroup',
      ];
      chatDependent.forEach(m =>
        setResult(m, {status: 'skip', message: 'no chat discovered'}),
      );
    }

    // User methods
    const uid = discoveredRef.current.userId;
    if (uid) {
      await run('getUserProfile', () => TdLib.getUserProfile(uid));
      await run('getUserFull', () => TdLib.getUserFull(uid));
      await run('getUserProfilePhotos', () =>
        TdLib.getUserProfilePhotos(uid, 0, 10),
      );
      await run('getUsersCompat', () => TdLib.getUsersCompat([uid]));
      await run('createPrivateChat', async () => {
        const r = await TdLib.createPrivateChat(uid);
        return r;
      });
    } else {
      ['getUserProfile', 'getUserFull', 'getUserProfilePhotos', 'getUsersCompat', 'createPrivateChat']
        .forEach(m => setResult(m, {status: 'skip', message: 'no discovered userId'}));
    }

    // File ops — probe with file_id=1 (may not exist, but exercises the bridge)
    await run('getFile', () => TdLib.getFile(1).catch(e => ({err: e.message})) as any);
    await run('downloadFile', () =>
      TdLib.downloadFile(1).catch(e => ({err: e.message})) as any,
    );
    await run('downloadFileByRemoteId', () =>
      TdLib.downloadFileByRemoteId('nonexistent').catch(
        e => ({err: e.message}),
      ) as any,
    );
    await run('cancelDownloadFile', () =>
      TdLib.cancelDownloadFile(1, true).catch(e => ({err: e.message})) as any,
    );
    await run('cancelDownloadByRemoteId', () =>
      TdLib.cancelDownloadByRemoteId('nonexistent', true).catch(
        e => ({err: e.message}),
      ) as any,
    );

    appendLog('— Safe sweep done —');
  }, [appendLog, authOk, run, setResult]);

  // Destructive/manual actions
  const runSendMessage = useCallback(async () => {
    const cid = Number(sampleChatId);
    if (!cid) {
      appendLog('⚠ set sampleChatId first');
      return;
    }
    await run('sendMessage', () => TdLib.sendMessage(cid, testMessageText));
  }, [appendLog, run, sampleChatId, testMessageText]);

  const runSetOption = useCallback(async () => {
    await run('setOption', () =>
      TdLib.setOption('online', {type: 'boolean', value: true}),
    );
  }, [run]);

  const runAddReaction = useCallback(async () => {
    const cid = Number(sampleChatId);
    const mid = Number(sampleMessageId);
    if (!cid || !mid) {
      appendLog('⚠ set sampleChatId+sampleMessageId first');
      return;
    }
    await run('addMessageReaction', () =>
      TdLib.addMessageReaction(cid, mid, '👍'),
    );
  }, [appendLog, run, sampleChatId, sampleMessageId]);

  const runRemoveReaction = useCallback(async () => {
    const cid = Number(sampleChatId);
    const mid = Number(sampleMessageId);
    if (!cid || !mid) {
      appendLog('⚠ set sampleChatId+sampleMessageId first');
      return;
    }
    await run('removeMessageReaction', () =>
      TdLib.removeMessageReaction(cid, mid, '👍'),
    );
  }, [appendLog, run, sampleChatId, sampleMessageId]);

  const runJoinChat = useCallback(async () => {
    const cid = Number(sampleChatId);
    if (!cid) {
      appendLog('⚠ set sampleChatId first');
      return;
    }
    await run('joinChat', () => TdLib.joinChat(cid));
  }, [appendLog, run, sampleChatId]);

  const runLeaveChat = useCallback(async () => {
    const cid = Number(sampleChatId);
    if (!cid) {
      appendLog('⚠ set sampleChatId first');
      return;
    }
    await run('leaveChat', () => TdLib.leaveChat(cid));
  }, [appendLog, run, sampleChatId]);

  const runAddComment = useCallback(async () => {
    const cid = Number(sampleChatId);
    if (!cid) {
      appendLog('⚠ set sampleChatId first');
      return;
    }
    await run('addComment', () =>
      TdLib.addComment(cid, 0, 0, 'Test comment from example'),
    );
  }, [appendLog, run, sampleChatId]);

  const runDeleteComment = useCallback(async () => {
    const cid = Number(sampleChatId);
    const mid = Number(sampleMessageId);
    if (!cid || !mid) {
      appendLog('⚠ set sampleChatId+sampleMessageId first');
      return;
    }
    await run('deleteComment', () => TdLib.deleteComment(cid, mid));
  }, [appendLog, run, sampleChatId, sampleMessageId]);

  const stats = useMemo(() => {
    const vals = Object.values(results);
    return {
      pass: vals.filter(v => v.status === 'pass').length,
      fail: vals.filter(v => v.status === 'fail').length,
      skip: vals.filter(v => v.status === 'skip').length,
      running: vals.filter(v => v.status === 'running').length,
      pending: vals.filter(v => v.status === 'pending').length,
      total: vals.length,
    };
  }, [results]);

  const renderRow = (name: string) => {
    const r = results[name];
    const icon = {
      pending: '·',
      running: '⟳',
      pass: '✓',
      fail: '✗',
      skip: '—',
    }[r.status];
    const color = {
      pending: '#999',
      running: '#007AFF',
      pass: 'green',
      fail: 'red',
      skip: 'gray',
    }[r.status];
    return (
      <View key={name} style={styles.row}>
        <Text style={[styles.rowIcon, {color}]}>{icon}</Text>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowMsg} numberOfLines={1}>
          {r.message ?? ''}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Methods Test</Text>
      <Text style={[styles.status, {color: authOk ? 'green' : 'red'}]}>
        Auth: {authState} • events seen: {eventsSeen}
      </Text>
      <Text style={styles.statsLine}>
        ✓ {stats.pass} ✗ {stats.fail} — {stats.skip} · {stats.pending} /
        {' '}
        {stats.total}
      </Text>

      <Button title="Run Safe Tests (read-only)" onPress={runSafeTests} />

      <Text style={styles.section}>Safe / read-only ({safeMethods.length})</Text>
      {safeMethods.map(renderRow)}

      <View style={styles.divider} />

      <Text style={styles.section}>Destructive (manual)</Text>
      <Text style={styles.note}>
        Sample IDs (populated by safe run; editable):
      </Text>
      <TextInput
        value={sampleChatId}
        onChangeText={setSampleChatId}
        placeholder="chatId"
        placeholderTextColor="gray"
        style={styles.input}
      />
      <TextInput
        value={sampleMessageId}
        onChangeText={setSampleMessageId}
        placeholder="messageId"
        placeholderTextColor="gray"
        style={styles.input}
      />
      <TextInput
        value={sampleUserId}
        onChangeText={setSampleUserId}
        placeholder="userId"
        placeholderTextColor="gray"
        style={styles.input}
      />
      <TextInput
        value={testMessageText}
        onChangeText={setTestMessageText}
        style={styles.input}
      />

      <View style={styles.buttonGrid}>
        <Button title="sendMessage" onPress={runSendMessage} />
        <Button title="setOption" onPress={runSetOption} />
        <Button title="addMessageReaction" onPress={runAddReaction} />
        <Button title="removeMessageReaction" onPress={runRemoveReaction} />
        <Button title="addComment (no topic)" onPress={runAddComment} />
        <Button title="deleteComment" onPress={runDeleteComment} />
        <Button title="joinChat" onPress={runJoinChat} />
        <Button title="leaveChat" onPress={runLeaveChat} />
      </View>

      <Text style={styles.note}>Session lifecycle (use with care):</Text>
      <View style={styles.buttonGrid}>
        <Button
          title="logout"
          color="#d33"
          onPress={() => run('logout', () => TdLib.logout())}
        />
        <Button
          title="destroy"
          color="#d33"
          onPress={() => run('destroy', () => TdLib.destroy())}
        />
      </View>

      <Text style={styles.note}>
        login / verifyPhoneNumber / verifyPassword / startTdLib /
        td_json_client_* — exercised from Auth + Base tabs respectively.
      </Text>

      {destructiveMethods.map(renderRow)}

      <View style={styles.divider} />
      <Text style={styles.section}>Log</Text>
      {log.map((line, i) => (
        <Text key={i} style={styles.logLine}>
          {line}
        </Text>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'white'},
  content: {padding: 8, paddingBottom: 40},
  title: {fontSize: 18, alignSelf: 'center', marginBottom: 10},
  status: {fontSize: 13, textAlign: 'center', marginBottom: 6},
  statsLine: {fontSize: 13, textAlign: 'center', marginBottom: 8},
  section: {fontSize: 14, fontWeight: 'bold', marginTop: 14, marginBottom: 4},
  note: {fontSize: 12, color: 'gray', marginTop: 6},
  input: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    height: 36,
    marginVertical: 4,
    color: 'black',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  rowIcon: {width: 18, fontSize: 14, fontWeight: 'bold'},
  rowName: {width: 200, fontSize: 12, fontFamily: 'monospace'},
  rowMsg: {flex: 1, fontSize: 11, color: '#555'},
  divider: {height: 1, backgroundColor: '#ddd', marginVertical: 12},
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  logLine: {fontSize: 10, fontFamily: 'monospace', color: '#333'},
});

export default MethodsTestExample;
