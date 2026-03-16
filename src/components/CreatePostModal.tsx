import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image, Video, Music, Code, Leaf, Cpu, Type, Smile } from 'lucide-react';
import { auth } from '../firebase';
import { createPost } from '../services/postService';
import { PostType } from '../types/profile';
import { EmojiPicker } from './EmojiPicker';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

const POST_TYPES: { type: PostType; label: string; icon: any; color: string }[] = [
  { type: 'text', label: 'Metin', icon: Type, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { type: 'photo', label: 'Fotoğraf', icon: Image, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { type: 'video', label: 'Video', icon: Video, color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { type: 'music', label: 'Müzik', icon: Music, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { type: 'code', label: 'Kod', icon: Code, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { type: 'nature', label: 'Doğa', icon: Leaf, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { type: 'tech', label: 'Teknoloji', icon: Cpu, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
];

export const CreatePostModal = ({ isOpen, onClose, onPostCreated }: CreatePostModalProps) => {
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('text');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mood, setMood] = useState('🌿');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = auth.currentUser;

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (file.size > 10 * 1024 * 1024) {
      setError('Dosya boyutu 10MB\'dan büyük olamaz');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      setError('Geçersiz dosya formatı. JPG, PNG, WebP, GIF veya MP4 yükleyebilirsiniz.');
      return;
    }

    setMediaFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || !currentUser) return;

    setIsUploading(true);
    setError(null);

    try {
      await createPost(
        currentUser.uid,
        currentUser.displayName || currentUser.email?.split('@')[0] || 'NatureUser',
        content.trim(),
        postType,
        {
          mediaFile: mediaFile || undefined,
          mood,
          avatar: currentUser.photoURL || undefined,
        }
      );

      // Reset form
      setContent('');
      setPostType('text');
      setMediaFile(null);
      setMediaPreview(null);
      setMood('🌿');
      
      onPostCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Post oluşturulamadı. Tekrar dene.');
      console.error('Create post error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const characterCount = content.length;
  const maxChars = 500;
  const isOverLimit = characterCount > maxChars;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-gradient-to-br from-[#1a1d29] to-[#0f1117] rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Yeni İçerik Paylaş</h2>
                <p className="text-sm text-white/40">Topluluğa katkıda bulun ve eco points kazan</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Post Type Selection */}
            <div className="mb-6">
              <label className="text-sm font-medium text-white/60 mb-3 block">İçerik Türü</label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {POST_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = postType === type.type;
                  return (
                    <button
                      key={type.type}
                      onClick={() => setPostType(type.type)}
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected
                          ? type.color
                          : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs block">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Textarea */}
            <div className="mb-6">
              <label className="text-sm font-medium text-white/60 mb-3 block">İçerik</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ne düşünüyorsun? Doğa hakkında bir şeyler paylaş..."
                className={`w-full bg-white/5 border ${
                  isOverLimit ? 'border-red-500/50' : 'border-white/10'
                } rounded-xl p-4 text-white placeholder-white/30 resize-none focus:outline-none focus:border-emerald-500/50 transition-colors`}
                rows={6}
                maxLength={600}
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-sm ${
                  isOverLimit ? 'text-red-400' : 'text-white/40'
                }`}>
                  {characterCount} / {maxChars}
                </span>
                {isOverLimit && (
                  <span className="text-xs text-red-400">Karakter sınırını aştınız</span>
                )}
              </div>
            </div>

            {/* Media Upload */}
            <div className="mb-6">
              <label className="text-sm font-medium text-white/60 mb-3 block">Medya (Opsiyonel)</label>
              
              {mediaPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  {mediaFile?.type.startsWith('video/') ? (
                    <video src={mediaPreview} controls className="w-full max-h-64 object-cover" />
                  ) : (
                    <img src={mediaPreview} alt="Preview" className="w-full max-h-64 object-cover" />
                  )}
                  <button
                    onClick={handleRemoveMedia}
                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-white/10 rounded-xl hover:border-emerald-500/50 hover:bg-white/5 transition-all group"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Image className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-sm text-white/60">Fotoğraf veya video yükle</p>
                    <p className="text-xs text-white/40">Maksimum 10MB (JPG, PNG, WebP, GIF, MP4)</p>
                  </div>
                </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                onChange={handleMediaSelect}
                className="hidden"
              />
            </div>

            {/* Mood Emoji Selection */}
            <div className="mb-6 relative">
              <label className="text-sm font-medium text-white/60 mb-3 block">Ruh Hali</label>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors w-full"
              >
                <span className="text-3xl">{mood}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm text-white">Ruh halini seç</p>
                  <p className="text-xs text-white/40">İçeriğine uygun bir emoji ekle</p>
                </div>
                <Smile className="w-5 h-5 text-white/40" />
              </button>
              
              {showEmojiPicker && (
                <div className="relative mt-2">
                  <EmojiPicker
                    onSelect={(emoji) => {
                      setMood(emoji);
                      setShowEmojiPicker(false);
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
              >
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 bg-black/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/40">
                <Leaf className="w-4 h-4 text-emerald-400" />
                <span>+10 Eco Points kazanacaksın</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!content.trim() || isOverLimit || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Paylaşılıyor...</span>
                    </>
                  ) : (
                    <span>Paylaş</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
