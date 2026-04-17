/**
 * Chats list — Telegram-styled, paginated, searchable.
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import TdLib from 'react-native-tdlib';
import ChatAvatar from '../components/ChatAvatar';
import {colors, formatTime} from '../theme';
import {safeJsonParse, tdEmitter} from '../tdlib';

export interface ChatSummary {
  id: number;
  title: string;
  unread_count?: number;
  last_message?: any;
  photo?: any;
  type?: any;
  positions?: any[];
}

interface Props {
  onOpenChat: (chat: ChatSummary) => void;
  onOpenDebug: () => void;
}

const PAGE_SIZE = 25;
const REFRESH_DEBOUNCE_MS = 400;

const ChatsScreen: React.FC<Props> = ({onOpenChat, onOpenDebug}) => {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatSummary[] | null>(null);

  const loadedCountRef = useRef(0);
  const inFlightRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(prev => prev || loadedCountRef.current === 0);
    try {
      const target = Math.max(PAGE_SIZE, loadedCountRef.current);
      if (loadedCountRef.current < target) {
        const r = await TdLib.loadChats(target - loadedCountRef.current).catch(
          () => null,
        );
        if (r === 'No more chats to load') setHasMore(false);
      }
      const raw = await TdLib.getChats(target);
      const list = safeJsonParse<ChatSummary[]>(raw) ?? [];
      loadedCountRef.current = list.length;
      setChats(list);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) return;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (inFlightRef.current || loadingMore || !hasMore) return;
    inFlightRef.current = true;
    setLoadingMore(true);
    try {
      const r = await TdLib.loadChats(PAGE_SIZE).catch(() => null);
      if (r === 'No more chats to load') {
        setHasMore(false);
      }
      const next = loadedCountRef.current + PAGE_SIZE;
      const raw = await TdLib.getChats(next);
      const list = safeJsonParse<ChatSummary[]>(raw) ?? [];
      if (list.length <= loadedCountRef.current) {
        setHasMore(false);
      }
      loadedCountRef.current = list.length;
      setChats(list);
    } catch {
      // swallow — user can pull-to-refresh
    } finally {
      setLoadingMore(false);
      inFlightRef.current = false;
    }
  }, [hasMore, loadingMore]);

  useEffect(() => {
    refresh();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const TYPES = new Set([
      'updateNewMessage',
      'updateChatLastMessage',
      'updateChatReadInbox',
      'updateChatTitle',
      'updateChatPhoto',
      'updateChatPosition',
      'updateNewChat',
    ]);
    const sub = tdEmitter.addListener('tdlib-update', event => {
      if (TYPES.has(event?.type)) scheduleRefresh();
    });
    return () => sub.remove();
  }, [scheduleRefresh]);

  // Search
  useEffect(() => {
    if (!searchOpen) {
      setSearchResults(null);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const raw = await TdLib.searchChats(q, 20);
        const list = safeJsonParse<ChatSummary[]>(raw) ?? [];
        setSearchResults(list);
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [query, searchOpen]);

  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => {
      const ao = Number(a.positions?.[0]?.order ?? 0);
      const bo = Number(b.positions?.[0]?.order ?? 0);
      return bo - ao;
    });
  }, [chats]);

  const displayed = searchResults ?? sortedChats;

  const onLogout = useCallback(() => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out? All local data will be removed.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            TdLib.logout().catch(() => {});
          },
        },
      ],
    );
  }, []);

  const renderItem = ({item}: {item: ChatSummary}) => {
    const preview = extractPreview(item.last_message);
    const time = item.last_message?.date ? formatTime(item.last_message.date) : '';
    const unread = item.unread_count ?? 0;
    return (
      <TouchableOpacity
        onPress={() => onOpenChat(item)}
        activeOpacity={0.6}
        style={styles.row}>
        <ChatAvatar id={item.id} title={item.title} photo={item.photo} size={52} />
        <View style={styles.body}>
          <View style={styles.rowTop}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title || 'Untitled'}
            </Text>
            <Text style={styles.time}>{time}</Text>
          </View>
          <View style={styles.rowBottom}>
            <Text style={styles.preview} numberOfLines={1}>
              {preview}
            </Text>
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unread > 99 ? '99+' : unread}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {searchOpen ? (
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search chats…"
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              autoFocus
            />
            <TouchableOpacity
              onPress={() => {
                setSearchOpen(false);
                setQuery('');
              }}
              style={styles.searchCancel}>
              <Text style={styles.searchCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.headerTitle}>Chats</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setSearchOpen(true)}
                style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>Search</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onOpenDebug} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>Debug</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onLogout}
                style={[styles.headerBtn, styles.headerBtnDanger]}>
                <Text
                  style={[styles.headerBtnText, styles.headerBtnDangerText]}>
                  Log out
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {loading && chats.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          initialNumToRender={15}
          windowSize={5}
          removeClippedSubviews
          onEndReachedThreshold={0.5}
          onEndReached={searchResults ? undefined : loadMore}
          refreshControl={
            searchResults ? undefined : (
              <RefreshControl
                refreshing={loading}
                onRefresh={refresh}
                tintColor={colors.primary}
              />
            )
          }
          ListFooterComponent={
            !searchResults && loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : !searchResults && !hasMore && chats.length > 0 ? (
              <Text style={styles.footerEnd}>· end ·</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {searchResults
                  ? query.trim()
                    ? 'Nothing found'
                    : 'Type to search'
                  : error ?? 'No chats yet. Pull to refresh.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

function extractPreview(message: any): string {
  if (!message) return '';
  const c = message.content;
  if (!c) return '';
  const type = c['@type'];
  switch (type) {
    case 'messageText':
      return c.text?.text ?? '';
    case 'messagePhoto':
      return '📷 Photo';
    case 'messageVideo':
      return '🎥 Video';
    case 'messageVideoNote':
      return '🟢 Video message';
    case 'messageVoiceNote':
      return '🎤 Voice message';
    case 'messageSticker':
      return `${c.sticker?.emoji ?? ''} Sticker`;
    case 'messageDocument':
      return `📎 ${c.document?.file_name ?? c.document?.fileName ?? 'Document'}`;
    case 'messageAnimation':
      return '🎞️ GIF';
    case 'messageAudio':
      return `🎵 ${c.audio?.title ?? 'Audio'}`;
    case 'messageLocation':
      return '📍 Location';
    case 'messageContact':
      return '👤 Contact';
    case 'messagePoll':
      return `📊 ${c.poll?.question?.text ?? 'Poll'}`;
    case 'messageCall':
      return '☎️ Call';
    case 'messageChatAddMembers':
      return 'joined the chat';
    case 'messageChatDeleteMember':
      return 'left the chat';
    case 'messagePinMessage':
      return 'pinned a message';
    case 'messageUnsupported':
      return '[unsupported]';
    default:
      return type ? type.replace(/^message/, '') : '';
  }
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  headerTitle: {fontSize: 24, fontWeight: '700', color: colors.textPrimary},
  headerActions: {flexDirection: 'row'},
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    marginLeft: 6,
  },
  headerBtnText: {color: colors.textSecondary, fontSize: 12, fontWeight: '600'},
  headerBtnDanger: {borderColor: colors.danger},
  headerBtnDangerText: {color: colors.danger},
  searchRow: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  searchCancel: {paddingHorizontal: 10, paddingVertical: 8},
  searchCancelText: {color: colors.primary, fontSize: 14, fontWeight: '600'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  row: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  body: {flex: 1, justifyContent: 'center', marginLeft: 12},
  rowTop: {flexDirection: 'row', alignItems: 'center', marginBottom: 4},
  rowBottom: {flexDirection: 'row', alignItems: 'center'},
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 8,
  },
  time: {fontSize: 12, color: colors.textTertiary},
  preview: {flex: 1, fontSize: 14, color: colors.textSecondary},
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    marginLeft: 8,
  },
  badgeText: {color: 'white', fontSize: 12, fontWeight: '700'},
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: 78,
  },
  empty: {paddingTop: 80, alignItems: 'center'},
  emptyText: {color: colors.textSecondary, fontSize: 14},
  footer: {paddingVertical: 16, alignItems: 'center'},
  footerEnd: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 11,
    paddingVertical: 14,
  },
});

export default ChatsScreen;
