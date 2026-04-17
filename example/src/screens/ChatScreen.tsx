/**
 * Chat view — messages, send, reactions, reply, typing, photos, info modal.
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import TdLib from 'react-native-tdlib';
import ChatAvatar from '../components/ChatAvatar';
import MessagePhoto from '../components/MessagePhoto';
import {colors, formatTime} from '../theme';
import {safeJsonParse, useTdUpdate} from '../tdlib';
import {ChatSummary} from './ChatsScreen';

interface Props {
  chat: ChatSummary;
  meId: number | null;
  onBack: () => void;
}

interface Message {
  id: number;
  chat_id: number;
  is_outgoing: boolean;
  sender_id: {user_id?: number; chat_id?: number; '@type': string};
  date: number;
  content: any;
  reply_to?: {
    '@type': string;
    chat_id?: number;
    message_id?: number;
  };
  interaction_info?: {
    reactions?: {
      reactions?: Array<{
        type: {'@type': string; emoji?: string};
        total_count: number;
        is_chosen?: boolean;
      }>;
    };
  };
}

interface ChatInfo {
  id: number;
  title: string;
  type?: any;
  description?: string;
  member_count?: number;
}

const QUICK_REACTIONS = ['❤️', '👍', '👎', '🔥', '😂', '😢', '🙏'];
const VIEW_BATCH_MS = 500;
const TYPING_TIMEOUT_MS = 5000;

const ChatScreen: React.FC<Props> = ({chat, meId, onBack}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [reactingOn, setReactingOn] = useState<Message | null>(null);
  const [actionOn, setActionOn] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const [infoOpen, setInfoOpen] = useState(false);
  const [info, setInfo] = useState<ChatInfo | null>(null);

  const [typingUserIds, setTypingUserIds] = useState<number[]>([]);

  const listRef = useRef<FlatList<Message>>(null);
  const viewedIdsRef = useRef<Set<number>>(new Set());
  const pendingViewRef = useRef<Set<number>>(new Set());
  const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const width = Dimensions.get('window').width;

  const flushViewed = useCallback(() => {
    const ids = Array.from(pendingViewRef.current).filter(
      id => !viewedIdsRef.current.has(id),
    );
    if (ids.length === 0) return;
    ids.forEach(id => viewedIdsRef.current.add(id));
    pendingViewRef.current.clear();
    TdLib.viewMessages(chat.id, ids, false).catch(() => {});
  }, [chat.id]);

  const enqueueViewed = useCallback(
    (ids: number[]) => {
      let added = false;
      for (const id of ids) {
        if (!viewedIdsRef.current.has(id)) {
          pendingViewRef.current.add(id);
          added = true;
        }
      }
      if (!added) return;
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
      viewTimerRef.current = setTimeout(flushViewed, VIEW_BATCH_MS);
    },
    [flushViewed],
  );

  const loadHistory = useCallback(
    async (fromMessageId = 0) => {
      try {
        const r = await TdLib.getChatHistory(chat.id, fromMessageId, 40, 0);
        const parsed = r
          .map(it => safeJsonParse<Message>(it.raw_json))
          .filter((m): m is Message => !!m);
        if (fromMessageId === 0) {
          setMessages(parsed);
        } else {
          setMessages(prev => [...prev, ...parsed]);
        }
        enqueueViewed(parsed.map(m => m.id));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [chat.id, enqueueViewed],
  );

  useEffect(() => {
    setLoading(true);
    viewedIdsRef.current.clear();
    pendingViewRef.current.clear();
    TdLib.openChat(chat.id).catch(() => {});
    loadHistory(0);
    return () => {
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
      typingTimersRef.current.forEach(t => clearTimeout(t));
      typingTimersRef.current.clear();
      TdLib.closeChat(chat.id).catch(() => {});
    };
  }, [chat.id, loadHistory]);

  useTdUpdate('updateNewMessage', data => {
    const msg = data?.message as Message | undefined;
    if (!msg || msg.chat_id !== chat.id) return;
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [msg, ...prev];
    });
    enqueueViewed([msg.id]);
  });

  useTdUpdate('updateMessageInteractionInfo', data => {
    if (data?.chat_id !== chat.id) return;
    const mid = data?.message_id;
    const ii = data?.interaction_info;
    if (!mid) return;
    setMessages(prev =>
      prev.map(m => (m.id === mid ? {...m, interaction_info: ii} : m)),
    );
  });

  useTdUpdate('updateMessageContent', data => {
    if (data?.chat_id !== chat.id) return;
    const mid = data?.message_id;
    const newContent = data?.new_content;
    if (!mid || !newContent) return;
    setMessages(prev =>
      prev.map(m => (m.id === mid ? {...m, content: newContent} : m)),
    );
  });

  useTdUpdate('updateChatAction', data => {
    if (data?.chat_id !== chat.id) return;
    const senderId = data?.sender_id?.user_id;
    if (!senderId || senderId === meId) return;
    const action = data?.action;
    const isCancel = action?.['@type'] === 'chatActionCancel';
    setTypingUserIds(prev => {
      if (isCancel) return prev.filter(id => id !== senderId);
      if (prev.includes(senderId)) return prev;
      return [...prev, senderId];
    });
    const existing = typingTimersRef.current.get(senderId);
    if (existing) clearTimeout(existing);
    if (!isCancel) {
      typingTimersRef.current.set(
        senderId,
        setTimeout(() => {
          setTypingUserIds(prev => prev.filter(id => id !== senderId));
          typingTimersRef.current.delete(senderId);
        }, TYPING_TIMEOUT_MS),
      );
    } else {
      typingTimersRef.current.delete(senderId);
    }
  });

  const onSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    const reply = replyingTo;
    setReplyingTo(null);
    try {
      await TdLib.sendMessage(chat.id, trimmed, reply?.id);
      setText('');
    } catch {
      // restore reply on failure so user can retry
      if (reply) setReplyingTo(reply);
    } finally {
      setSending(false);
    }
  }, [chat.id, text, replyingTo]);

  // Fire a typing action as the user types, throttled to one per 3s.
  const typingSentRef = useRef<number>(0);
  const onChangeText = useCallback(
    (t: string) => {
      setText(t);
      const now = Date.now();
      if (now - typingSentRef.current > 3000 && t.length > 0) {
        typingSentRef.current = now;
        TdLib.td_json_client_send({
          '@type': 'sendChatAction',
          chat_id: chat.id,
          action: {'@type': 'chatActionTyping'},
        }).catch(() => {});
      }
    },
    [chat.id],
  );

  const loadOlder = useCallback(() => {
    if (messages.length === 0) return;
    const oldest = messages[messages.length - 1];
    if (!oldest) return;
    loadHistory(oldest.id);
  }, [loadHistory, messages]);

  const toggleReaction = useCallback(
    async (msg: Message, emoji: string) => {
      setReactingOn(null);
      const existing = msg.interaction_info?.reactions?.reactions?.find(
        r => r.type['@type'] === 'reactionTypeEmoji' && r.type.emoji === emoji,
      );
      try {
        if (existing?.is_chosen) {
          await TdLib.removeMessageReaction(chat.id, msg.id, emoji);
        } else {
          await TdLib.addMessageReaction(chat.id, msg.id, emoji);
        }
      } catch {
        // ignore
      }
    },
    [chat.id],
  );

  const openInfo = useCallback(async () => {
    setInfoOpen(true);
    try {
      const r = await TdLib.getChat(chat.id);
      const c = safeJsonParse<ChatInfo>(r?.raw ?? '');
      setInfo(c);
    } catch {
      setInfo(null);
    }
  }, [chat.id]);

  const startReply = useCallback((msg: Message) => {
    setActionOn(null);
    setReplyingTo(msg);
  }, []);

  const messagesById = useMemo(() => {
    const m = new Map<number, Message>();
    messages.forEach(x => m.set(x.id, x));
    return m;
  }, [messages]);

  const renderItem = ({item}: {item: Message}) => {
    const own = meId != null && item.sender_id?.user_id === meId;
    const reactions = item.interaction_info?.reactions?.reactions ?? [];
    const isPhoto = item.content?.['@type'] === 'messagePhoto';
    const replyToId =
      item.reply_to?.['@type'] === 'messageReplyToMessage'
        ? item.reply_to.message_id
        : undefined;
    const replyTarget = replyToId ? messagesById.get(replyToId) : undefined;

    return (
      <View
        style={[styles.bubbleRow, own ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
        <Pressable
          onLongPress={() => setActionOn(item)}
          delayLongPress={250}
          style={[
            styles.bubble,
            own ? styles.bubbleOwn : styles.bubbleOther,
            isPhoto && styles.bubblePhoto,
          ]}>
          {replyToId ? (
            <View style={styles.replyQuote}>
              <View style={styles.replyBar} />
              <Text style={styles.replyText} numberOfLines={1}>
                {replyTarget
                  ? renderContent(replyTarget.content)
                  : `reply to #${replyToId}`}
              </Text>
            </View>
          ) : null}

          {isPhoto ? (
            <MessagePhoto
              photo={item.content.photo}
              caption={item.content.caption?.text}
              maxWidth={width * 0.68}
            />
          ) : (
            <Text style={styles.bubbleText}>{renderContent(item.content)}</Text>
          )}

          {reactions.length > 0 && (
            <View style={styles.reactionsRow}>
              {reactions.map((r, i) => (
                <Pressable
                  key={i}
                  onPress={() => toggleReaction(item, r.type.emoji ?? '')}
                  style={[
                    styles.reactionPill,
                    r.is_chosen && styles.reactionPillActive,
                  ]}>
                  <Text style={styles.reactionEmoji}>{r.type.emoji ?? '?'}</Text>
                  <Text
                    style={[
                      styles.reactionCount,
                      r.is_chosen && styles.reactionCountActive,
                    ]}>
                    {r.total_count}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={styles.bubbleTime}>{formatTime(item.date)}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openInfo} style={styles.headerCenter}>
          <ChatAvatar id={chat.id} title={chat.title} photo={chat.photo} size={36} />
          <View style={styles.headerBody}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {chat.title}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {typingUserIds.length > 0 ? 'typing…' : 'tap for info'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.listContent}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          initialNumToRender={20}
          windowSize={7}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          }
        />
      )}

      {replyingTo ? (
        <View style={styles.replyingBar}>
          <View style={styles.replyingBar_accent} />
          <View style={{flex: 1}}>
            <Text style={styles.replyingBar_label}>Replying to</Text>
            <Text style={styles.replyingBar_preview} numberOfLines={1}>
              {renderContent(replyingTo.content)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setReplyingTo(null)}
            style={styles.replyingBar_close}>
            <Text style={styles.replyingBar_closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.inputBar}>
        <TextInput
          value={text}
          onChangeText={onChangeText}
          placeholder="Message"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          multiline
        />
        <TouchableOpacity
          onPress={onSend}
          disabled={sending || !text.trim()}
          style={[
            styles.sendBtn,
            (sending || !text.trim()) && styles.sendBtnDisabled,
          ]}
          activeOpacity={0.8}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Action menu (Reply / React) */}
      <Modal
        visible={actionOn != null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionOn(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActionOn(null)}>
          <View style={styles.actionSheet}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                const m = actionOn;
                setActionOn(null);
                if (m) setReactingOn(m);
              }}>
              <Text style={styles.actionEmoji}>😊</Text>
              <Text style={styles.actionLabel}>React</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => actionOn && startReply(actionOn)}>
              <Text style={styles.actionEmoji}>↩︎</Text>
              <Text style={styles.actionLabel}>Reply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Reaction picker */}
      <Modal
        visible={reactingOn != null}
        transparent
        animationType="fade"
        onRequestClose={() => setReactingOn(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReactingOn(null)}>
          <View style={styles.reactionPicker}>
            {QUICK_REACTIONS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionPickerBtn}
                onPress={() => {
                  if (reactingOn) toggleReaction(reactingOn, emoji);
                }}>
                <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Chat info */}
      <Modal
        visible={infoOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoOpen(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setInfoOpen(false)}>
          <Pressable style={styles.infoSheet}>
            <View style={styles.infoHeader}>
              <ChatAvatar
                id={chat.id}
                title={chat.title}
                photo={chat.photo}
                size={72}
              />
              <Text style={styles.infoTitle}>{chat.title}</Text>
              <Text style={styles.infoType}>
                {describeType(info?.type ?? chat.type)}
              </Text>
            </View>
            {info?.description ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>About</Text>
                <Text style={styles.infoValue}>{info.description}</Text>
              </View>
            ) : null}
            {typeof info?.member_count === 'number' ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Members</Text>
                <Text style={styles.infoValue}>{info.member_count}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chat ID</Text>
              <Text style={styles.infoValue}>{String(chat.id)}</Text>
            </View>
            <TouchableOpacity
              style={styles.infoClose}
              onPress={() => setInfoOpen(false)}>
              <Text style={styles.infoCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
};

function describeType(t: any): string {
  if (!t) return '';
  switch (t['@type']) {
    case 'chatTypePrivate':
      return 'private chat';
    case 'chatTypeBasicGroup':
      return 'group';
    case 'chatTypeSupergroup':
      return t.is_channel ? 'channel' : 'supergroup';
    case 'chatTypeSecret':
      return 'secret chat';
    default:
      return t['@type'] ?? '';
  }
}

function renderContent(content: any): string {
  if (!content) return '';
  const type = content['@type'] as string | undefined;
  const caption = content.caption?.text;
  const captionSuffix = caption ? ` · ${caption}` : '';
  switch (type) {
    case 'messageText':
      return content.text?.text ?? '';
    case 'messagePhoto':
      return `📷 Photo${captionSuffix}`;
    case 'messageVideo':
      return `🎥 Video${captionSuffix}`;
    case 'messageVideoNote':
      return '🟢 Video message';
    case 'messageVoiceNote':
      return '🎤 Voice message';
    case 'messageSticker':
      return `${content.sticker?.emoji ?? ''} Sticker`;
    case 'messageDocument': {
      const name = content.document?.file_name ?? 'Document';
      return `📎 ${name}${captionSuffix}`;
    }
    case 'messageAnimation':
      return `🎞️ GIF${captionSuffix}`;
    case 'messageAudio':
      return `🎵 ${content.audio?.title ?? 'Audio'}${captionSuffix}`;
    case 'messageLocation':
      return '📍 Location';
    case 'messageVenue':
      return `📍 ${content.venue?.title ?? 'Venue'}`;
    case 'messageContact':
      return `👤 Contact: ${content.contact?.first_name ?? ''}`;
    case 'messagePoll':
      return `📊 Poll: ${content.poll?.question?.text ?? ''}`;
    case 'messageCall':
      return '☎️ Call';
    case 'messageChatAddMembers':
      return '👋 joined';
    case 'messageChatDeleteMember':
      return '🚪 left';
    case 'messageChatJoinByLink':
      return '🔗 joined via invite link';
    case 'messagePinMessage':
      return '📌 pinned a message';
    case 'messageChatChangeTitle':
      return `✏️ changed title to "${content.title ?? ''}"`;
    case 'messageChatChangePhoto':
      return '🖼️ changed chat photo';
    case 'messageChatDeletePhoto':
      return '🖼️ removed chat photo';
    case 'messageUnsupported':
      return '[unsupported by TDLib]';
    default:
      return type ? `[${type.replace(/^message/, '')}]` : '[empty]';
  }
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  header: {
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  backBtn: {paddingHorizontal: 8, paddingVertical: 4, marginRight: 4},
  backText: {fontSize: 32, color: colors.primary, lineHeight: 32, marginTop: -4},
  headerCenter: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  headerBody: {flex: 1, marginLeft: 10},
  headerTitle: {fontSize: 16, fontWeight: '600', color: colors.textPrimary},
  headerSubtitle: {fontSize: 12, color: colors.textSecondary, marginTop: 2},

  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  listContent: {paddingHorizontal: 10, paddingVertical: 10},
  empty: {paddingTop: 80, alignItems: 'center'},
  emptyText: {color: colors.textSecondary, fontSize: 14},

  bubbleRow: {marginVertical: 2, flexDirection: 'row'},
  bubbleRowOwn: {justifyContent: 'flex-end'},
  bubbleRowOther: {justifyContent: 'flex-start'},
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: colors.bubbleShadow,
    shadowOpacity: 0.5,
    shadowRadius: 1,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  bubbleOwn: {backgroundColor: colors.bubbleOwn, borderBottomRightRadius: 4},
  bubbleOther: {backgroundColor: colors.bubbleOther, borderBottomLeftRadius: 4},
  bubblePhoto: {padding: 4},
  bubbleText: {fontSize: 15, color: colors.textPrimary, lineHeight: 20},
  bubbleTime: {
    fontSize: 10,
    color: colors.textTertiary,
    alignSelf: 'flex-end',
    marginTop: 2,
  },

  replyQuote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
    paddingRight: 8,
    paddingVertical: 4,
  },
  replyBar: {width: 3, backgroundColor: colors.primary, marginRight: 6, alignSelf: 'stretch'},
  replyText: {flex: 1, fontSize: 12, color: colors.textSecondary},

  reactionsRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 6},
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  reactionPillActive: {backgroundColor: 'rgba(42,171,238,0.18)'},
  reactionEmoji: {fontSize: 12},
  reactionCount: {
    fontSize: 11,
    marginLeft: 3,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  reactionCountActive: {color: colors.primary},

  replyingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  replyingBar_accent: {
    width: 3,
    height: 32,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginRight: 8,
  },
  replyingBar_label: {fontSize: 11, color: colors.primary, fontWeight: '600'},
  replyingBar_preview: {fontSize: 13, color: colors.textSecondary},
  replyingBar_close: {paddingHorizontal: 8, paddingVertical: 4},
  replyingBar_closeText: {fontSize: 18, color: colors.textSecondary},

  inputBar: {
    flexDirection: 'row',
    padding: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 120,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {backgroundColor: colors.divider},
  sendBtnText: {color: 'white', fontSize: 18, marginLeft: 2},

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSheet: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 6,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 12,
    shadowOpacity: 1,
    elevation: 6,
  },
  actionBtn: {alignItems: 'center', justifyContent: 'center', padding: 14, minWidth: 80},
  actionEmoji: {fontSize: 22},
  actionLabel: {fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: '600'},

  reactionPicker: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 30,
    padding: 8,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 12,
    shadowOpacity: 1,
    elevation: 8,
  },
  reactionPickerBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionPickerEmoji: {fontSize: 28},

  infoSheet: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
    width: '84%',
    maxWidth: 360,
    alignItems: 'stretch',
  },
  infoHeader: {alignItems: 'center', marginBottom: 18},
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
    textAlign: 'center',
  },
  infoType: {fontSize: 13, color: colors.textSecondary, marginTop: 2},
  infoRow: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  infoLabel: {fontSize: 12, color: colors.textSecondary, marginBottom: 2},
  infoValue: {fontSize: 15, color: colors.textPrimary},
  infoClose: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  infoCloseText: {color: 'white', fontWeight: '600', fontSize: 15},
});

export default ChatScreen;
