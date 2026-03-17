import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { T } from '../theme/index';

interface ChatMsg { id: string; role: 'user' | 'assistant'; content: string; }

const GROQ_API_KEY = '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';

export const AIScreen = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: '0', role: 'assistant', content: 'Merhaba! Ben NatureBot. Doga, cevre ve surdurulebilirlik hakkinda sana yardimci olabilirim. 🌿' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: 'Sen NatureBot, Nature.co platformunun AI asistanisin. Doga, cevre, surdurulebilirlik ve ekoloji konularinda uzmansin. Turkce konusuyorsun.' },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
          max_tokens: 500,
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Bir hata olustu, tekrar dene.';
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply }]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Baglanti hatasi. Lutfen tekrar dene.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View style={s.botIcon}><Text style={{ fontSize: 20 }}>🤖</Text></View>
        <View>
          <Text style={s.headerTitle}>NatureBot</Text>
          <Text style={{ color: T.accent, fontSize: 11 }}>Doga AI Asistani</Text>
        </View>
      </View>
      <FlatList ref={flatListRef} data={messages} keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item: msg }) => (
          <View style={{ alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <View style={[s.bubble, msg.role === 'user' ? s.userBubble : s.botBubble]}>
              <Text style={{ color: T.text, fontSize: 15, lineHeight: 22 }}>{msg.content}</Text>
            </View>
          </View>
        )} />
      {loading && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8, alignItems: 'flex-start' }}>
          <View style={[s.bubble, s.botBubble, { flexDirection: 'row', gap: 4 }]}>
            {[0,1,2].map(i => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: T.accent, opacity: 0.7 }} />)}
          </View>
        </View>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.inputRow}>
          <TextInput style={s.msgInput} placeholder="NatureBot'a sor..." placeholderTextColor={T.textMuted}
            value={input} onChangeText={setInput} onSubmitEditing={sendMessage} returnKeyType="send" multiline />
          <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && { backgroundColor: T.surface }]}
            onPress={sendMessage} disabled={!input.trim() || loading}>
            {loading ? <ActivityIndicator size="small" color={T.textMuted} /> : <Ionicons name="send" size={17} color={input.trim() ? '#fff' : T.textMuted} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
  botIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  headerTitle: { color: T.text, fontWeight: '700', fontSize: 16 },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  userBubble: { backgroundColor: T.bubble, borderWidth: 1, borderColor: T.border, borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.borderSubtle, borderBottomLeftRadius: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingHorizontal: 12, backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  msgInput: { flex: 1, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: T.text, fontSize: 15, maxHeight: 100 },
  sendBtn: { backgroundColor: T.accent, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
