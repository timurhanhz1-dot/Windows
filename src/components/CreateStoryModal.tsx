import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image, Video, Upload, Sparkles } from 'lucide-react';
import { auth } from '../firebase';
import { createStory } from '../services/storyService';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated?: () => void;
}

export const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) => {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
    setMediaType(file.type.startsWith('video/') ? 'video' : 'photo');
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
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!mediaFile || !currentUser) return;

    setIsUploading(true);
    setError(null);

    try {
      await createStory(
        currentUser.uid,
        currentUser.displayName || currentUser.email?.split('@')[0] || 'NatureUser',
        mediaFile,
        5 // 5 seconds duration
      );

      // Reset form
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType(null);
      
      onStoryCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Story oluşturulamadı. Tekrar dene.');
      console.error('Create story error:', err);
    } finally {
      setIsUploading(false);
    }
  };

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
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Yeni Story Oluştur</h2>
                <p className="text-sm text-white/40">24 saat sonra kaybolacak bir hikaye paylaş</p>
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
            {/* Media Upload/Preview */}
            {mediaPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                {mediaType === 'video' ? (
                  <video 
                    src={mediaPreview} 
                    controls 
                    className="w-full max-h-[500px] object-contain"
                  />
                ) : (
                  <img 
                    src={mediaPreview} 
                    alt="Story Preview" 
                    className="w-full max-h-[500px] object-contain"
                  />
                )}
                <button
                  onClick={handleRemoveMedia}
                  className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-xl transition-colors backdrop-blur-sm"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                
                {/* Story Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-3">
                    <img 
                      src={currentUser?.photoURL || '/default-avatar.png'} 
                      alt="Avatar"
                      className="w-10 h-10 rounded-full border-2 border-emerald-400"
                    />
                    <div>
                      <p className="text-white font-medium">
                        {currentUser?.displayName || 'NatureUser'}
                      </p>
                      <p className="text-xs text-white/60">Şimdi</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[9/16] max-h-[500px] border-2 border-dashed border-white/10 rounded-2xl hover:border-emerald-500/50 hover:bg-white/5 transition-all group"
              >
                <div className="flex flex-col items-center justify-center gap-4 h-full">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-white mb-1">Fotoğraf veya Video Yükle</p>
                    <p className="text-sm text-white/60 mb-2">Story'n 24 saat boyunca görünür olacak</p>
                    <p className="text-xs text-white/40">Maksimum 10MB (JPG, PNG, WebP, GIF, MP4)</p>
                  </div>
                  <div className="flex items-center gap-4 text-white/40">
                    <div className="flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      <span className="text-sm">Fotoğraf</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      <span className="text-sm">Video</span>
                    </div>
                  </div>
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

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
              >
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Info Box */}
            {!mediaPreview && (
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-400 mb-1">Story İpuçları</p>
                    <ul className="text-xs text-white/60 space-y-1">
                      <li>• Story'ler 24 saat sonra otomatik olarak silinir</li>
                      <li>• Dikey (9:16) formatı en iyi görünümü sağlar</li>
                      <li>• Takipçilerin story'ni görebilir ve tepki verebilir</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 bg-black/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/40">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>24 saat boyunca görünür</span>
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
                  disabled={!mediaFile || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Paylaşılıyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Story Paylaş</span>
                    </>
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
