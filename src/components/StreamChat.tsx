import React, { useState, useEffect, useRef } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { db, auth } from '../firebase'
import { ref, onValue, push } from 'firebase/database'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '../services/liveStreamingService'
import { aiModerationService } from '../services/aiModerationService'

interface StreamChatProps {
  streamId: string
  isStreamer?: boolean
  bannedUsers?: string[]
  theme?: any
}

const MAX_MSG_LENGTH = 500   // Gereksinim 6.2
const MAX_MESSAGES = 200     // Gereksinim 6.4

/**
 * Gerçek zamanlı yayın sohbet bileşeni.
 * Gereksinim 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.4
 */
const StreamChat: React.FC<StreamChatProps> = ({
  streamId,
  isStreamer = false,
  bannedUsers = [],
  theme,
}) => {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const user = auth.currentUser
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Misafir'

  // Firebase'den mesajları gerçek zamanlı dinle (Gereksinim 6.1)
  useEffect(() => {
    if (!streamId) return
    const msgRef = ref(db, `stream_chat/${streamId}`)
    const unsub = onValue(msgRef, snap => {
      const data = snap.val()
      if (!data) { setMessages([]); return }
      const list: ChatMessage[] = Object.entries(data)
        .map(([id, v]: any) => ({ id, ...v }))
        .sort((a, b) => (a.ts || 0) - (b.ts || 0))
        .slice(-MAX_MESSAGES) // Gereksinim 6.4
      setMessages(list)
    })
    return () => unsub()
  }, [streamId])

  // Yeni mesajda otomatik kaydır (Gereksinim 6.6)
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    }
  }, [messages.length])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !user || !streamId) return

    // Yasaklı kullanıcı kontrolü (Gereksinim 6.5, 10.5)
    if (bannedUsers.includes(user.uid)) return

    // 500 karakter sınırı (Gereksinim 6.2)
    const text = input.trim().slice(0, MAX_MSG_LENGTH)

    // AI Moderation check
    try {
      const moderation = await aiModerationService.analyzeContent(text, user.uid, `stream_${streamId}`)
      if (moderation.isViolation && moderation.confidence > 90) {
        alert(`Mesaj engellendi: ${moderation.reasoning}`)
        return
      }
      if (moderation.isViolation && moderation.confidence > 70) {
        const proceed = confirm(`Uyarı: ${moderation.reasoning}\n\nYine de göndermek istiyor musun?`)
        if (!proceed) return
      }
    } catch (modErr) {
      console.error('Moderation check failed, proceeding:', modErr)
    }

    push(ref(db, `stream_chat/${streamId}`), {
      uid: user.uid,
      user: displayName,
      text,
      ts: Date.now(),
      isModerator: isStreamer,
    } satisfies Omit<ChatMessage, 'id'>)

    setInput('')
  }

  return (
    <div className="flex flex-col h-full bg-black/20">
      {/* Header */}
      <div className="h-12 border-b border-white/5 flex items-center px-4 flex-shrink-0">
        <span className="text-xs font-black text-white uppercase tracking-widest">{t('stream.liveChat')}</span>
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.map(msg => (
          <div key={msg.id} className="group">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                msg.isModerator ? 'text-purple-400' : 'text-blue-400'
              }`}>
                {msg.user}
              </span>
              {msg.isModerator && <Sparkles size={9} className="text-purple-400" />}
            </div>
            {/* XSS koruması: dangerouslySetInnerHTML kullanılmıyor (Gereksinim 10.4) */}
            <p className="text-sm text-white/80 leading-relaxed break-words">{msg.text}</p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 bg-black/20 flex-shrink-0">
        <form onSubmit={handleSend} className="relative">
          <input
            value={input}
            onChange={e => setInput(e.target.value.slice(0, MAX_MSG_LENGTH))}
            placeholder={user ? t('stream.joinChat') : t('stream.loginToChat')}
            disabled={!user || bannedUsers.includes(user?.uid || '')}
            maxLength={MAX_MSG_LENGTH}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/40 transition-all pr-10 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!input.trim() || !user}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-purple-400 transition-all disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </form>
        {input.length > MAX_MSG_LENGTH * 0.9 && (
          <p className="text-[10px] text-yellow-400/70 mt-1 text-right">
            {input.length}/{MAX_MSG_LENGTH}
          </p>
        )}
      </div>
    </div>
  )
}

export default StreamChat
