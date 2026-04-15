import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AuthorizationExample from './src/AuthorizationExample';
import ChatListExample from './src/ChatListExample';

const tabs = ['Auth', 'Chats'] as const;

const App = () => {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Auth');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}>
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === 'Auth' && <AuthorizationExample />}
      {activeTab === 'Chats' && <ChatListExample />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'white'},
  tabBar: {
    flexDirection: 'row',
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {fontSize: 14, color: '#666'},
  activeTabText: {color: '#007AFF', fontWeight: '600'},
});

export default App;
