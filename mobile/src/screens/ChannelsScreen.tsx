import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase/index';
import { ref, onValue, off, push } from 'firebase/database';
import { T } from '../theme/index';

interface Channel { id: string; name: string; description?: string; memberCount?: number; }
interface Message { id: string; sender_id: string; sender_name: string; content: string; timestamp: string; }

export const ChannelsScreen = ({ userId, username }: { userId: string; username: string }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const chRef = ref(db, 'channels');
    onValue(chRef, snap => {
      const data = snap.val() || {};
      const arr: Channel[] = Object.entries(data).map(([id, c]: [string, any]) => ({ id, ...c }));
      setChannels(arr);
    });
    return () => off(ref(db, 'channels'));
  }, []);

  useEffect(() => {
    if (!activeChannel) return;
    const msgsRef = ref(db, `channel_messages/${activeChannel.id}`);
    onValue(msgsRef, snap => {
      const data = snap.val() || {};
      const arr: Message[] = Object.entries(data)
        .map(([id, m]: [string, any]) => ({ id, ...m }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(arr);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    });
    return () => off(ref(db, `channel_messages/${activeChannel.id}`));
  }, [activeChannel?.id]);

  const sendMessage = async () => {
    if (!input.trim() || !activeChannel) return;
    await push(ref(db, `channel_messages/${activeChannel.id}`), {
      sender_id: userId, sender_name: username,
      content: input.trim(), timestamp: new Date().toISOString(),
    });
    setInput('');
  };

  // --- Channel Chat View ---
  if (activeChannel) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setActiveChannel(null)} style={{ padding: 4, marginRight: 8 }}>
            <Ionicons name="arrow-back" size={22} color={T.textMuted} />
          </TouchableOpacity>
          <View style={s.channelIconSmall}>
            <Ionicons name={"hash" as any} size={14} color={T.accent} />
          </View>
          <Text style={s.headerTitle}>{activeChannel.name}</Text>
          <TouchableOpacity style={{ padding: 4 }}>
            <Ionicons name="people-outline" size={20} color={T.textMuted} />
          </TouchableOpacity>
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <View style={s.emptyIcon}>
                <Ionicons name={"hash" as any} size={32} color={T.accent} />
              </View>
              <Text style={{ color: T.text, fontWeight: '700', fontSize: 16, marginTop: 12 }}>#{activeChannel.name}</Text>
              <Text style={{ color: T.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
                Bu kanalın başlangıcı. İlk mesajı sen gönder!
              </Text>
            </View>
          }
          renderItem={({ item: msg }) => {
            const isMe = msg.sender_id === userId;
            return (
              <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                {!isMe && <Text style={{ color: T.accent, fontSize: 11, marginBottom: 2, marginLeft: 4 }}>{msg.sender_name}</Text>}
                <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
                  <Text style={{ color: T.text, fontSize: 15 }}>{msg.content}</Text>
                  <Text style={{ color: T.textMuted, fontSize: 10, marginTop: 3, textAlign: 'right' }}>
                    {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.inputRow}>
            <TextInput
              style={s.msgInput}
              placeholder={`#${activeChannel.name} kanalına yaz...`}
              placeholderTextColor={T.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[s.sendBtn, !input.trim() && { backgroundColor: T.surface }]}
              onPress={sendMessage}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={17} color={input.trim() ? '#fff' : T.textMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- Server/Channel List View ---
  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Sunucularım</Text>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={20} color={T.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Action Buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn}>
            <View style={[s.actionIcon, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
              <Ionicons name="add-circle-outline" size={20} color="#22c55e" />
            </View>
            <Text style={[s.actionLabel, { color: '#22c55e' }]}>Oluştur</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn}>
            <View style={[s.actionIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
              <Ionicons name="enter-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={[s.actionLabel, { color: '#3b82f6' }]}>Katıl</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn}>
            <View style={[s.actionIcon, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
              <Ionicons name="compass-outline" size={20} color="#a855f7" />
            </View>
            <Text style={[s.actionLabel, { color: '#a855f7' }]}>Keşfet</Text>
          </TouchableOpacity>
        </View>

        {/* Channel List or Empty State */}
        {channels.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Ionicons name="grid-outline" size={36} color={T.accent} />
            </View>
            <Text style={s.emptyTitle}>Henüz sunucu yok</Text>
            <Text style={s.emptyDesc}>
              Bir sunucu oluştur veya mevcut bir sunucuya katıl
            </Text>
            <TouchableOpacity style={s.emptyBtn}>
              <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Sunucu Oluştur</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ padding: 12, gap: 8 }}>
            <Text style={s.sectionLabel}>KANALLAR</Text>
            {channels.map(ch => (
              <TouchableOpacity key={ch.id} style={s.channelCard} onPress={() => setActiveChannel(ch)}>
                <View style={s.channelIconBig}>
                  <Ionicons name={"hash" as any} size={18} color={T.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: T.text, fontWeight: '700', fontSize: 15 }}>{ch.name}</Text>
                  {ch.description && (
                    <Text style={{ color: T.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {ch.description}
                    </Text>
                  )}
                </View>
                {ch.memberCount != null && (
                  <View style={s.memberBadge}>
                    <Ionicons name="people-outline" size={11} color={T.textMuted} />
                    <Text style={{ color: T.textMuted, fontSize: 11, marginLeft: 3 }}>{ch.memberCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={T.textMuted} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  headerTitle: { color: T.text, fontSize: 20, fontWeight: '700', flex: 1 },
  addBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: T.border,
  },
  actionRow: {
    flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8,
  },
  actionBtn: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: T.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: T.border,
  },
  actionIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  sectionLabel: {
    color: T.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, marginBottom: 4, marginLeft: 2,
  },
  channelCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: T.border,
  },
  channelIconBig: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center',
  },
  channelIconSmall: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.bg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: T.border,
  },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { color: T.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { color: T.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.accent, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
  },
  bubble: { maxWidth: '75%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18 },
  bubbleMe: { backgroundColor: T.bubble, borderWidth: 1, borderColor: T.border, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.borderSubtle, borderBottomLeftRadius: 4 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, paddingHorizontal: 12,
    backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border,
  },
  msgInput: {
    flex: 1, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    color: T.text, fontSize: 15,
  },
  sendBtn: {
    backgroundColor: T.accent, borderRadius: 20,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
});
