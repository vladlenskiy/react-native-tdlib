/**
 * Example: Chat List & Options
 * Demonstrates loadChats, getChats, getOption, setOption, and event listeners
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  Button,
  FlatList,
  NativeEventEmitter,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import TdLib from 'react-native-tdlib';

const eventEmitter = new NativeEventEmitter(NativeModules.TdLibModule);

const ChatListExample = () => {
  const [chats, setChats] = useState<any[]>([]);
  const [tdlibVersion, setTdlibVersion] = useState<string>('');
  const [updates, setUpdates] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');

  // Subscribe to TDLib update events
  useEffect(() => {
    const subscription = eventEmitter.addListener('tdlib-update', event => {
      setUpdates(prev => [`[${event.type}]`, ...prev.slice(0, 19)]);
    });

    // Check if TDLib is ready
    TdLib.getAuthorizationState()
      .then(r => {
        const state = JSON.parse(r)['@type'];
        if (state === 'authorizationStateReady') {
          setStatus('Authorized');
        } else {
          setStatus(`Not ready: ${state}. Go to Auth tab first.`);
        }
      })
      .catch(() => setStatus('TDLib not initialized. Go to Auth tab first.'));

    return () => subscription.remove();
  }, []);

  // Fetch TDLib version via getOption
  const fetchVersion = useCallback(async () => {
    try {
      const version = await TdLib.getOption('version');
      setTdlibVersion(version ?? 'unknown');
    } catch (e: any) {
      console.log('getOption error:', e.message);
    }
  }, []);

  // Load and display chat list
  const fetchChats = useCallback(async () => {
    try {
      await TdLib.loadChats(20);
      const result = await TdLib.getChats(20);
      const parsed = JSON.parse(result);
      setChats(parsed);
    } catch (e: any) {
      console.log('getChats error:', e.message);
    }
  }, []);

  // Set online status via setOption
  const goOnline = useCallback(async () => {
    try {
      await TdLib.setOption('online', {type: 'boolean', value: true});
      console.log('Set online = true');
    } catch (e: any) {
      console.log('setOption error:', e.message);
    }
  }, []);

  const renderChat = ({item}: {item: any}) => (
    <View style={styles.chatItem}>
      <Text style={styles.chatTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.chatId}>ID: {item.id}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Chat List & Options</Text>

        {status ? (
          <Text
            style={[
              styles.status,
              {color: status === 'Authorized' ? 'green' : 'red'},
            ]}>
            {status}
          </Text>
        ) : null}

        <Text style={styles.section}>TDLib Options</Text>
        <Button title="Get TDLib Version" onPress={fetchVersion} />
        {tdlibVersion ? (
          <Text style={styles.info}>TDLib version: {tdlibVersion}</Text>
        ) : null}
        <Button title="Set Online" onPress={goOnline} />

        <View style={styles.divider} />

        <Text style={styles.section}>Chat List</Text>
        <Button title="Load Chats" onPress={fetchChats} />
        {chats.length > 0 ? (
          <Text style={styles.info}>{chats.length} chats loaded</Text>
        ) : null}

        <FlatList
          data={chats}
          renderItem={renderChat}
          keyExtractor={item => String(item.id)}
          scrollEnabled={false}
          style={styles.list}
        />

        <View style={styles.divider} />

        <Text style={styles.section}>Live Updates</Text>
        <Text style={styles.info}>
          Showing last {updates.length} events from NativeEventEmitter
        </Text>
        {updates.map((u, i) => (
          <Text key={i} style={styles.update}>
            {u}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'white'},
  contentContainer: {paddingTop: 20, paddingHorizontal: 8, paddingBottom: 40},
  title: {fontSize: 18, alignSelf: 'center', marginBottom: 10},
  status: {fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8},
  section: {fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 6},
  info: {fontSize: 12, color: 'gray', marginVertical: 4},
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: 'black',
    marginVertical: 14,
  },
  list: {marginTop: 8},
  chatItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatTitle: {fontSize: 14, fontWeight: '500'},
  chatId: {fontSize: 11, color: 'gray', marginTop: 2},
  update: {fontSize: 11, fontFamily: 'monospace', color: '#666'},
});

export default ChatListExample;
