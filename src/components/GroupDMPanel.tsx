import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Send, X, ArrowLeft, UserPlus, LogOut, Smile } from 'lucide-react';
import {
  GroupDM, GroupDMMessage,
  createGroupDM, listenUserGroupDMs, listenGroupMessages,
  sendGroupMessage, addMemberToGroup, leaveGroup,
} from '../services/groupDMService';
import { ref, get, onValue, off, push } from 'firebase/database';
import { db } from '../firebase';
import { StickerPicker } from './StickerPicker';

interface GroupDMPanelProps {
  userId: string;
  currentUserName: string;
  allUsers: any[]; // { id, username, avatar }
}

export const GroupDMPanel = ({ userId, currentUserName, allUsers }: GroupDMPanelProps) => {
  const [groups, setGroups] = useState<GroupDM[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupDM | null>(null);
  const [messages, setMessages] = useState<GroupDMMessage[]>([]);
  const [input, setInput] = useState('');
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = listenUserGroupDMs(userId, setGroups);
    return unsub;
  }, [userId]);

  useEffect(() => {
    if (!activeGroup) return;
    setMessages([]);
    const unsub = listenGroupMessages(activeGroup.id, setMessages);
    return unsub;
  }, [activeGroup?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Kullanıcı adlarını map'e al — önce allUsers prop'undan, sonra Firebase'den güncel hali
  useEffect(() => {
    const map: Record<string, any> = {};
    allUsers.forEach(u => { map[u.id] = u; });
    setUsersMap(map);
  }, [allUsers]);

  // Firebase'den tüm kullanıcıların güncel isimlerini dinle (arkadaş olmayan grup üyeleri için)
  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      setUsersMap(prev => {
        const updated = { ...prev };
        Object.entries(data).forEach(([uid, val]: [string, any]) => {
          updated[uid] = {
            ...updated[uid],
            id: uid,
            username: val?.username,
            displayName: val?.displayName,
            avatar: val?.avatar || val?.photoURL,
          };
        });
        return updated;
      });
    });
    return () => off(usersRef);
  }, []);
  const handleCreate = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) return;
    const members = [userId, ...selectedMembers];
    const groupId = await createGroupDM(newGroupName.trim(), members, userId);
    setShowCreate(false);
    setNewGroupName('');
    setSelectedMembers([]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeGroup) return;
    const content = input.trim();
    setInput('');
    await sendGroupMessage(activeGroup.id, userId, currentUserName, content);
  };

  const handleSendSticker = async (sticker: string) => {
    if (!activeGroup) return;
    await sendGroupMessage(activeGroup.id, userId, currentUserName, sticker, 'sticker');
  };

  const handleAddMember = async (memberId: string) => {
    if (!activeGroup) return;
    await addMemberToGroup(activeGroup.id, memberId);
    setShowAddMember(false);
    setAddMemberSearch('');
  };

  const handleLeave = async () => {
    if (!activeGroup) return;
    if (!confirm('Gruptan ayrılmak istediğine emin misin?')) return;
    await leaveGroup(activeGroup.id, userId);
    setActiveGroup(null);
  };

  const filteredUsers = allUsers.filter(u =>
    u.id !== userId &&
    (u.username || '').toLowerCase().includes(memberSearch.toLowerCase())
  );

  const addMemberCandidates = allUsers.filter(u =>
    u.id !== userId &&
    !activeGroup?.members.includes(u.id) &&
    (u.username || '').toLowerCase().includes(addMemberSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Grup listesi — activeGroup yokken göster */}
      {!activeGroup && (
        <>
          <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-emerald-400" />
              <span className="text-sm font-bold text-white">Grup Sohbetleri</span>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
              title="Yeni grup oluştur"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {groups.length === 0 ? (
              <div className="p-6 text-center text-white/30 text-sm">
                <Users size={32} className="mx-auto mb-2 opacity-20" />
                Henüz grup yok
              </div>
            ) : (
              groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group)}
                  className="w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Users size={16} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{group.name}</p>
                      <p className="text-[11px] text-white/40 truncate">
                        {group.lastMessage || `${group.members.length} üye`}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {/* Chat alanı — activeGroup varken göster */}
      {activeGroup && (
          <>
            {/* Header */}
            <div className="h-14 border-b border-white/5 flex items-center px-4 gap-3 bg-black/20">
              <button onClick={() => setActiveGroup(null)} className="text-white/40 hover:text-white md:hidden">
                <ArrowLeft size={18} />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-500/20 flex items-center justify-center">
                <Users size={14} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{activeGroup.name}</p>
                <p className="text-[10px] text-white/40">{activeGroup.members.length} üye</p>
              </div>
              <button
                onClick={() => setShowAddMember(true)}
                className="p-1.5 rounded-lg text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                title="Üye ekle"
              >
                <UserPlus size={16} />
              </button>
              <button
                onClick={handleLeave}
                className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Gruptan ayrıl"
              >
                <LogOut size={16} />
              </button>
            </div>

            {/* Mesajlar */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {messages.map(msg => {
                const isOwn = msg.sender_id === userId;
                return (
                  <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">
                      {(usersMap[msg.sender_id]?.username || msg.sender_name || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                      {!isOwn && (
                        <span className="text-[10px] text-white/40 px-1">
                          {usersMap[msg.sender_id]?.displayName || usersMap[msg.sender_id]?.username || msg.sender_name}
                        </span>
                      )}
                      <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-emerald-500/20 text-white rounded-tr-sm' : 'bg-white/5 text-white/90 rounded-tl-sm'}`}>
                        {msg.type === 'sticker' ? (
                          <span className="text-4xl leading-none select-none">{msg.content}</span>
                        ) : msg.content}
                      </div>
                      <span className="text-[9px] text-white/25 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-white/5 flex gap-2 relative">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`${activeGroup.name} grubuna mesaj yaz...`}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStickerPicker(p => !p)}
                  className="p-2.5 text-white/40 hover:text-yellow-400 hover:bg-white/10 rounded-xl transition-all"
                  title="Sticker"
                >
                  <span className="text-base leading-none">🎭</span>
                </button>
                <AnimatePresence>
                  {showStickerPicker && (
                    <StickerPicker
                      onSelect={handleSendSticker}
                      onClose={() => setShowStickerPicker(false)}
                      userId={userId}
                    />
                  )}
                </AnimatePresence>
              </div>
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        )}

      {/* Grup oluşturma modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#111418] border border-white/10 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-base">Yeni Grup Oluştur</h3>
                <button onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Grup adı..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 mb-4"
              />

              <input
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Üye ara..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 mb-3"
              />

              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedMembers.map(id => (
                    <span key={id} className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs text-emerald-300">
                      {usersMap[id]?.username || id}
                      <button onClick={() => setSelectedMembers(prev => prev.filter(m => m !== id))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-1 mb-4 custom-scrollbar">
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedMembers(prev =>
                      prev.includes(user.id) ? prev.filter(m => m !== user.id) : [...prev, user.id]
                    )}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${selectedMembers.includes(user.id) ? 'bg-emerald-500/20 border border-emerald-500/30' : 'hover:bg-white/5'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-300">
                      {(user.username || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-sm text-white">{user.username}</span>
                    {selectedMembers.includes(user.id) && <span className="ml-auto text-emerald-400 text-xs">✓</span>}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCreate}
                disabled={!newGroupName.trim() || selectedMembers.length === 0}
                className="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all disabled:opacity-40"
              >
                Grup Oluştur ({selectedMembers.length} üye seçildi)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Üye ekleme modal */}
      <AnimatePresence>
        {showAddMember && activeGroup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddMember(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#111418] border border-white/10 rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-base">Üye Ekle</h3>
                <button onClick={() => setShowAddMember(false)} className="text-white/40 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <input
                value={addMemberSearch}
                onChange={e => setAddMemberSearch(e.target.value)}
                placeholder="Kullanıcı ara..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 mb-3"
              />
              <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
                {addMemberCandidates.length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-4">Eklenecek kullanıcı bulunamadı</p>
                ) : addMemberCandidates.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleAddMember(user.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-500/10 transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-300">
                      {(user.username || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-sm text-white">{user.username}</span>
                    <UserPlus size={14} className="ml-auto text-emerald-400" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
