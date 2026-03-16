import React from 'react';
import { X, Shield, Lock, Eye, Trash2, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export const PrivacyPolicy = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      onClick={e => e.stopPropagation()}
      className="w-full max-w-2xl bg-[#111418] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-emerald-400" />
          <h2 className="text-white font-bold text-lg">Gizlilik Politikası</h2>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto px-6 py-5 space-y-6 text-white/70 text-sm leading-relaxed">
        <p className="text-white/40 text-xs">Son güncelleme: Mart 2026 · KVKK & GDPR uyumlu</p>

        {[
          {
            icon: Eye, title: 'Toplanan Veriler',
            content: 'Nature.co olarak kullanıcı adı, e-posta adresi, profil fotoğrafı ve gönderilen mesajları Firebase altyapısında saklıyoruz. IP adresleri yalnızca güvenlik amaçlı, sınırlı süre tutulur. Üçüncü taraflarla kişisel veri paylaşımı yapılmaz.'
          },
          {
            icon: Lock, title: 'Veri Güvenliği',
            content: 'Tüm veriler Firebase\'in sunduğu şifreleme (TLS/SSL) ile aktarılır. Şifreler Firebase Authentication tarafından hash\'lenerek saklanır, düz metin olarak hiçbir zaman tutulmaz. Rate limiting ve XSS koruması aktiftir.'
          },
          {
            icon: Globe, title: 'Çerezler & Oturum',
            content: 'Yalnızca oturum sürdürme amacıyla zorunlu çerezler kullanılır. Reklam veya izleme çerezi bulunmaz. Oturum süresi 30 gün olup güvenli çıkış yapıldığında tüm oturum verileri silinir.'
          },
          {
            icon: Trash2, title: 'Veri Silme Hakkı',
            content: 'KVKK Madde 7 ve GDPR Madde 17 kapsamında istediğiniz zaman hesabınızı ve tüm verilerinizi kalıcı olarak silme hakkına sahipsiniz. Silme talebini profil ayarlarından veya admin üzerinden iletebilirsiniz.'
          },
          {
            icon: Shield, title: 'Haklarınız',
            content: 'Kişisel verilerinize erişim, düzeltme, silme ve işlemenin kısıtlanmasını talep edebilirsiniz. Veri işleme faaliyetlerine itiraz hakkınız mevcuttur. Talepleriniz için uygulama içi mesaj veya admin kanalını kullanabilirsiniz.'
          },
        ].map(({ icon: Icon, title, content }) => (
          <div key={title} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon size={16} className="text-emerald-400 shrink-0" />
              <h3 className="text-white font-semibold">{title}</h3>
            </div>
            <p className="text-white/50 pl-6">{content}</p>
          </div>
        ))}

        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <p className="text-emerald-400 text-xs font-bold mb-1">🌿 Çevre Taahhüdü</p>
          <p className="text-white/50 text-xs">Nature.co, karbon ayak izini en aza indirmek için optimize edilmiş altyapı kullanır. Gereksiz veri depolamaktan kaçınılır, pasif hesaplar 30 gün sonra temizlenir.</p>
        </div>
      </div>
    </motion.div>
  </div>
);
