import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase/index';
import { ref, onValue, off, push, get } from 'firebase/database';
import { T } from '../theme/index';

interface Channel { id: string; name: string; description?: string; }
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
      const arr: Message[] = Object.entries(data).map(([id, m]: [string, any]) => ({ id, ...m }));
      arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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

  if (activeChannel) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setActiveChannel(null)} style={{ padding: 4, marginRight: 8 }}>
            <Ionicons name="arrow-back" size={22} color={T.textMuted} />
          </TouchableOpacity>
          <Ionicons name={"hash" as any} size={18} color={T.accent} style={{ marginRight: 6 }} />
          <Text style={s.headerTitle}>{activeChannel.name}</Text>
        </View>
        <FlatList ref={flatListRef} data={messages} keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
          }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.inputRow}>
            <TextInput style={s.msgInput} placeholder={`#${activeChannel.name} kanalina yaz...`}
              placeholderTextColor={T.textMuted} value={input} onChangeText={setInput}
              onSubmitEditing={sendMessage} returnKeyType="send" />
            <TouchableOpacity style={[s.sendBtn, !input.trim() && { backgroundColor: T.surface }]}
              onPress={sendMessage} disabled={!input.trim()}>
              <Ionicons name="send" size={17} color={input.trim() ? '#fff' : T.textMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Kanallar</Text>
      </View>
      <FlatList data={channels} keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        ListEmptyComponent={<Text style={{ color: T.textMuted, textAlign: 'center', padding: 40 }}>Kanal bulunamadi</Text>}
        renderItem={({ item: ch }) => (
          <TouchableOpacity style={s.channelCard} onPress={() => setActiveChannel(ch)}>
            <View style={s.channelIcon}><Ionicons name={"hash" as any} size={18} color={T.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: T.text, fontWeight: '700', fontSize: 15 }}>{ch.name}</Text>
              {ch.description && <Text style={{ color: T.textMuted, fontSize: 13, marginTop: 2 }}>{ch.description}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
          </TouchableOpacity>
        )} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  headerTitle: { color: T.text, fontSize: 20, fontWeight: '700', flex: 1 },
  channelCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: T.border },
  channelIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '75%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18 },
  bubbleMe: { backgroundColor: T.bubble, borderWidth: 1, borderColor: T.border, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.borderSubtle, borderBottomLeftRadius: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingHorizontal: 12, backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  msgInput: { flex: 1, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: T.text, fontSize: 15 },
  sendBtn: { backgroundColor: T.accent, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
