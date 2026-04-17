import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TdLib from 'react-native-tdlib';
import AuthScreen from './src/screens/AuthScreen';
import ChatsScreen, {ChatSummary} from './src/screens/ChatsScreen';
import ChatScreen from './src/screens/ChatScreen';
import MethodsTestExample from './src/MethodsTestExample';
import {colors} from './src/theme';
import {safeJsonParse, useAuthState} from './src/tdlib';

type Route =
  | {name: 'chats'}
  | {name: 'chat'; chat: ChatSummary}
  | {name: 'debug'};

const App: React.FC = () => {
  const auth = useAuthState();
  const [route, setRoute] = useState<Route>({name: 'chats'});
  const [meId, setMeId] = useState<number | null>(null);

  useEffect(() => {
    if (auth.state !== 'ready') return;
    TdLib.getProfile()
      .then(r => {
        const me = safeJsonParse<{id: number}>(r);
        if (me?.id) setMeId(me.id);
      })
      .catch(() => {});
  }, [auth.state]);

  useEffect(() => {
    if (auth.state !== 'ready' && route.name !== 'chats') {
      setRoute({name: 'chats'});
    }
  }, [auth.state, route.name]);

  const isAuthed = auth.state === 'ready';

  let body: React.ReactNode;
  if (!isAuthed) {
    body = <AuthScreen info={auth} />;
  } else if (route.name === 'chats') {
    body = (
      <ChatsScreen
        onOpenChat={chat => setRoute({name: 'chat', chat})}
        onOpenDebug={() => setRoute({name: 'debug'})}
      />
    );
  } else if (route.name === 'chat') {
    body = (
      <ChatScreen
        chat={route.chat}
        meId={meId}
        onBack={() => setRoute({name: 'chats'})}
      />
    );
  } else {
    body = (
      <View style={styles.container}>
        <MethodsTestExample />
        <View style={styles.debugFab}>
          <TouchableOpacity
            onPress={() => setRoute({name: 'chats'})}
            style={styles.debugFabBtn}>
            <Text style={styles.debugFabText}>Close Debug</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.container}>{body}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  container: {flex: 1, backgroundColor: colors.background},
  debugFab: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  debugFabBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
    shadowOpacity: 1,
    elevation: 4,
  },
  debugFabText: {color: 'white', fontWeight: '700', fontSize: 14},
});

export default App;
