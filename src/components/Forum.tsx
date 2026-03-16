import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ForumAiAssistCard from "./ForumAiAssistCard";
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, Search, Plus, Clock, ThumbsUp, X, Bold, Italic,
  Underline, Strikethrough, List, ListOrdered, AlignLeft, Code,
  Link, Palette, ArrowLeft, Send, MoreVertical, Edit2, Flag, Trash2, Check, Brain
} from 'lucide-react';
import ForumAiTopicGeneratorCard from './ForumAiTopicGeneratorCard';
import { advancedForumService } from '../services/advancedForumService';
import { aiModerationService } from '../services/aiModerationService';
import ForumDashboard from './ForumDashboard';
import { db } from '../firebase';
import { ref, onValue, push, off, update, remove, get } from 'firebase/database';
import { auth } from '../firebase';

interface Post {
  id: string; author_id: string; author_name: string;
  title: string; content: string; category: string;
  created_at: number; likes?: Record<string, boolean>;
  views?: number; reply_count?: number; edited?: boolean;
}
interface Comment {
  id: string; author_id: string; author_name: string;
  content: string; created_at: number;
  likes?: Record<string, boolean>; edited?: boolean;
}

function formatDate(ts: number) {
  if (!ts) return '';
  const d = new Date(ts), now = new Date(), diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Az önce';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} dk önce`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} sa önce`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

const COLORS = ['#ffffff','#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84cc16','#f97316'];
const CATS = ['Genel','Doga','Cevre','Teknoloji','Soru','Duyuru'];
const CAT_LABELS: Record<string,string> = { Genel:'Genel', Doga:'Doğa', Cevre:'Çevre', Teknoloji:'Teknoloji', Soru:'Soru', Duyuru:'Duyuru' };
const CAT_COLORS: Record<string,string> = { Doga:'#10B981', Cevre:'#06B6D4', Teknoloji:'#3B82F6', Soru:'#F59E0B', Duyuru:'#EF4444', Genel:'#8B5CF6' };

function RichEditor({ onChange, initialHtml='', compact=false }: { onChange:(h:string)=>void; initialHtml?:string; compact?:boolean }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColors, setShowColors] = useState(false);
  const [fmt, setFmt] = useState<Record<string,boolean>>({});
  const inited = useRef(false);

  useEffect(() => {
    if (editorRef.current && initialHtml && !inited.current) {
      editorRef.current.innerHTML = initialHtml; inited.current = true;
    }
  }, [initialHtml]);

  const exec = useCallback((cmd:string, val?:string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    checkFmt();
    onChange(editorRef.current?.innerHTML||'');
  }, [onChange]);

  const applyColor = useCallback((color:string) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel||sel.rangeCount===0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const span = document.createElement('span');
    span.style.color = color;
    try { range.surroundContents(span); }
    catch { const f=range.extractContents(); span.appendChild(f); range.insertNode(span); }
    onChange(editorRef.current?.innerHTML||'');
  }, [onChange]);

  const checkFmt = () => setFmt({
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    strike: document.queryCommandState('strikeThrough'),
    ol: document.queryCommandState('insertOrderedList'),
    ul: document.queryCommandState('insertUnorderedList'),
  });

  const b = (active?:boolean):React.CSSProperties => ({
    padding:'4px 6px', borderRadius:5, border:'none', cursor:'pointer',
    background: active?'rgba(16,185,129,0.2)':'transparent',
    color: active?'#10B981':'rgba(255,255,255,0.6)',
    display:'flex', alignItems:'center', justifyContent:'center',
  });

  return (
    <div style={{border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,overflow:'visible',background:'rgba(255,255,255,0.04)'}}>
      <div style={{display:'flex',alignItems:'center',gap:1,padding:'5px 8px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexWrap:'wrap'}}>
        <button style={b(fmt.bold)} onMouseDown={e=>{e.preventDefault();exec('bold')}} title="Kalın"><Bold size={13}/></button>
        <button style={b(fmt.italic)} onMouseDown={e=>{e.preventDefault();exec('italic')}} title="İtalik"><Italic size={13}/></button>
        <button style={b(fmt.underline)} onMouseDown={e=>{e.preventDefault();exec('underline')}} title="Altı çizili"><Underline size={13}/></button>
        <button style={b(fmt.strike)} onMouseDown={e=>{e.preventDefault();exec('strikeThrough')}} title="Üstü çizili"><Strikethrough size={13}/></button>
        <div style={{width:1,height:14,background:'rgba(255,255,255,0.1)',margin:'0 3px'}}/>
        <button style={b(fmt.ul)} onMouseDown={e=>{e.preventDefault();exec('insertUnorderedList')}}><List size={13}/></button>
        <button style={b(fmt.ol)} onMouseDown={e=>{e.preventDefault();exec('insertOrderedList')}}><ListOrdered size={13}/></button>
        {!compact && <>
          <button style={b()} onMouseDown={e=>{e.preventDefault();exec('justifyLeft')}}><AlignLeft size={13}/></button>
          <button style={b()} onMouseDown={e=>{e.preventDefault();exec('formatBlock','pre')}}><Code size={13}/></button>
          <button style={b()} onMouseDown={e=>{e.preventDefault();const u=prompt('Link:','https://');if(u)exec('createLink',u)}}><Link size={13}/></button>
        </>}
        <div style={{width:1,height:14,background:'rgba(255,255,255,0.1)',margin:'0 3px'}}/>
        <div style={{position:'relative'}}>
          <button style={b()} onMouseDown={e=>{e.preventDefault();setShowColors(v=>!v)}}><Palette size={13}/></button>
          {showColors&&<div style={{position:'absolute',top:'110%',left:0,zIndex:200,background:'#1a1d22',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,padding:8,display:'flex',gap:5,flexWrap:'wrap',width:130,boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}>
            {COLORS.map(c=><button key={c} onMouseDown={e=>{e.preventDefault();applyColor(c);setShowColors(false)}} style={{width:20,height:20,borderRadius:4,background:c,border:c==='#ffffff'?'1px solid rgba(255,255,255,0.3)':'none',cursor:'pointer'}}/>)}
          </div>}
        </div>
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning
        onInput={()=>{onChange(editorRef.current?.innerHTML||'');checkFmt()}}
        onKeyUp={checkFmt} onMouseUp={checkFmt}
        data-placeholder="İçerik..."
        style={{minHeight:compact?60:110,padding:'10px 12px',color:'#fff',fontSize:13,lineHeight:1.6,outline:'none'}}
      />
      <style>{`
        [contenteditable]:empty:before{content:attr(data-placeholder);color:rgba(255,255,255,0.25);pointer-events:none}
        [contenteditable] a{color:#10B981;text-decoration:underline}
        [contenteditable] pre{background:rgba(255,255,255,0.06);padding:6px 10px;border-radius:6px;font-family:monospace;font-size:12px}
        [contenteditable] ul,[contenteditable] ol{padding-left:20px}
        .fpc{color:rgba(255,255,255,0.8)}
        .fpc a{color:#10B981}
        .fpc pre{background:rgba(255,255,255,0.06);padding:4px 8px;border-radius:4px;font-family:monospace;font-size:11px}
        .fpc ul,.fpc ol{padding-left:16px}
      `}</style>
    </div>
  );
}

function PostDetail({ post, currentUserId, currentName, onBack }: {
  post: Post; currentUserId: string; currentName: string; onBack: ()=>void;
}) {
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);
  const [editCategory, setEditCategory] = useState(post.category);
  const [editCommentId, setEditCommentId] = useState<string|null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [postMenu, setPostMenu] = useState(false);
  const [cmtMenu, setCmtMenu] = useState<string|null>(null);
  const [liked, setLiked] = useState(!!post.likes?.[currentUserId]);
  const [likeCount, setLikeCount] = useState(Object.values(post.likes||{}).filter(Boolean).length);
  const isOwner = post.author_id === currentUserId;
  const catColor = CAT_COLORS[post.category] || '#8B5CF6';

  useEffect(()=>{
    const r = ref(db,`forum_comments/${post.id}`);
    onValue(r,snap=>{
      const data = snap.val()||{};
      const list:Comment[] = Object.entries(data).map(([id,v]:any)=>({id,...v}));
      list.sort((a,b)=>a.created_at-b.created_at);
      setComments(list);
    });
    return ()=>off(r);
  },[post.id]);

  const likePost = async ()=>{
    const r = ref(db,`forum/${post.id}/likes/${currentUserId}`);
    if(liked){await remove(r);setLiked(false);setLikeCount(c=>c-1);}
    else{await update(ref(db,`forum/${post.id}/likes`),{[currentUserId]:true});setLiked(true);setLikeCount(c=>c+1);}
  };

  const savePost = async ()=>{
    if(!editTitle.trim()||!editContent.trim()) return;
    await update(ref(db,`forum/${post.id}`),{title:editTitle.trim(),content:editContent.trim(),category:editCategory,edited:true});
    setEditingPost(false);
  };

  const deletePost = async ()=>{
    if(!confirm('Bu gönderiyi silmek istediğinden emin misin?')) return;
    await remove(ref(db,`forum/${post.id}`));
    onBack();
  };

  const reportPost = async ()=>{
    const reason = prompt('Şikayet sebebi (opsiyonel):') || '';
    await push(ref(db,'reports'),{
      type: 'post',
      post_id: post.id,
      content_preview: post.title,
      target_author: post.author_name,
      target_author_id: post.author_id,
      reporter_id: currentUserId,
      reporter_name: currentName,
      reason,
      created_at: Date.now(),
    });
    alert('Şikayetin admin paneline iletildi, teşekkürler.');
    setPostMenu(false);
  };

  const addComment = async ()=>{
    if(!commentText.trim()) return;
    setSubmitting(true);
    try {
      await push(ref(db,`forum_comments/${post.id}`),{
        author_id:currentUserId, author_name:currentName,
        content:commentText.trim(), created_at:Date.now(), likes:{},
      });
      await update(ref(db,`forum/${post.id}`),{reply_count:comments.length+1});
      setCommentText('');
    } finally { setSubmitting(false); }
  };

  const likeComment = async (c:Comment)=>{
    const r = ref(db,`forum_comments/${post.id}/${c.id}/likes/${currentUserId}`);
    const snap = await get(r);
    if(snap.val()) await remove(r);
    else await update(ref(db,`forum_comments/${post.id}/${c.id}/likes`),{[currentUserId]:true});
  };

  const reportComment = async (c:Comment)=>{
    const reason = prompt('Şikayet sebebi (opsiyonel):') || '';
    await push(ref(db,'reports'),{
      type: 'comment',
      post_id: post.id,
      comment_id: c.id,
      content_preview: (c.content||'').replace(/<[^>]+>/g,'').substring(0,100),
      target_author: c.author_name,
      target_author_id: c.author_id,
      reporter_id: currentUserId,
      reporter_name: currentName,
      reason,
      created_at: Date.now(),
    });
    alert('Şikayet admin paneline iletildi.'); setCmtMenu(null);
  };

  const saveComment = async (c:Comment)=>{
    if(!editCommentText.trim()) return;
    await update(ref(db,`forum_comments/${post.id}/${c.id}`),{content:editCommentText.trim(),edited:true});
    setEditCommentId(null);
  };

  const deleteComment = async (c:Comment)=>{
    await remove(ref(db,`forum_comments/${post.id}/${c.id}`));
    setCmtMenu(null);
  };

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#0B0E11'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.5)',display:'flex'}}><ArrowLeft size={20}/></button>
        <span style={{fontWeight:700,fontSize:15,color:'#fff',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{post.title}</span>
        <div style={{position:'relative'}}>
          <button onClick={()=>setPostMenu(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)'}}><MoreVertical size={18}/></button>
          <AnimatePresence>
            {postMenu&&<motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
              style={{position:'absolute',right:0,top:'110%',background:'#1a1d22',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:4,minWidth:150,zIndex:50,boxShadow:'0 8px 24px rgba(0,0,0,0.4)'}}>
              {isOwner&&<>
                <button onClick={()=>{setEditingPost(true);setPostMenu(false)}} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'none',border:'none',cursor:'pointer',color:'#fff',fontSize:13,borderRadius:7}}><Edit2 size={14} color="#10B981"/> Düzenle</button>
                <button onClick={deletePost} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:13,borderRadius:7}}><Trash2 size={14}/> Sil</button>
              </>}
              {!isOwner&&<button onClick={reportPost} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'none',border:'none',cursor:'pointer',color:'#F59E0B',fontSize:13,borderRadius:7}}><Flag size={14}/> Şikayet Et</button>}
            </motion.div>}
          </AnimatePresence>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
        {/* Post */}
        {editingPost ? (
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:16,marginBottom:16}}>
            <input value={editTitle} onChange={e=>setEditTitle(e.target.value)}
              style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 12px',color:'#fff',fontSize:14,outline:'none',marginBottom:10,boxSizing:'border-box'}}/>
            <select value={editCategory} onChange={e=>setEditCategory(e.target.value)}
              style={{width:'100%',background:'#1a1d22',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 12px',color:'#fff',fontSize:13,outline:'none',marginBottom:10,boxSizing:'border-box'}}>
              {CATS.map(c=><option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
            <RichEditor onChange={setEditContent} initialHtml={post.content}/>
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <button onClick={()=>setEditingPost(false)} style={{flex:1,padding:'8px',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)',border:'none',borderRadius:8,cursor:'pointer',fontSize:13}}>İptal</button>
              <button onClick={savePost} style={{flex:1,padding:'8px',background:'#10B981',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Check size={14}/> Kaydet</button>
            </div>
          </div>
        ):(
          <div style={{marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <span style={{fontSize:11,fontWeight:600,color:catColor,background:catColor+'18',padding:'2px 8px',borderRadius:20}}>{CAT_LABELS[post.category]||post.category}</span>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.35)',display:'flex',alignItems:'center',gap:3}}><Clock size={10}/>{formatDate(post.created_at)}</span>
              {post.edited&&<span style={{fontSize:10,color:'rgba(255,255,255,0.25)',fontStyle:'italic'}}>düzenlendi</span>}
            </div>
            <div style={{fontWeight:700,fontSize:18,color:'#fff',marginBottom:12,lineHeight:1.4}}>{post.title}</div>
            <div className="fpc" style={{fontSize:14,lineHeight:1.7,marginBottom:14}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(post.content)}}/>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              <span 
                style={{fontSize:12,color:'rgba(255,255,255,0.4)',cursor:'pointer'}}
                onClick={() => navigate(`/profile/${post.author_id}`)}
                onMouseEnter={e => (e.currentTarget.style.color='#10B981')}
                onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.4)')}
              >{post.author_name}</span>
              <button onClick={likePost} style={{display:'flex',alignItems:'center',gap:5,background:liked?'rgba(16,185,129,0.15)':'rgba(255,255,255,0.05)',border:'none',borderRadius:20,padding:'5px 14px',cursor:'pointer',color:liked?'#10B981':'rgba(255,255,255,0.4)',fontSize:12,transition:'all 0.2s'}}>
                <ThumbsUp size={13}/> {likeCount}
              </button>
            </div>
          </div>
        )}

        {/* Comments */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:16}}>
          <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.05em'}}>{comments.length} Yorum</div>
          {comments.map(c=>{
            const cLiked = !!c.likes?.[currentUserId];
            const cLikes = Object.values(c.likes||{}).filter(Boolean).length;
            const isMe = c.author_id === currentUserId;
            return (
              <div key={c.id} style={{marginBottom:10,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:12,padding:12}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:24,height:24,borderRadius:8,background:'#10B98122',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#10B981'}}>
                      {(c.author_name||'?').substring(0,2).toUpperCase()}
                    </div>
                    <span style={{fontSize:12,fontWeight:600,color:'#fff'}}>{c.author_name}</span>
                    <span style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>{formatDate(c.created_at)}</span>
                    {c.edited&&<span style={{fontSize:10,color:'rgba(255,255,255,0.2)',fontStyle:'italic'}}>düzenlendi</span>}
                  </div>
                  <div style={{position:'relative'}}>
                    <button onClick={()=>setCmtMenu(cmtMenu===c.id?null:c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',padding:2}}><MoreVertical size={14}/></button>
                    <AnimatePresence>
                      {cmtMenu===c.id&&<motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
                        style={{position:'absolute',right:0,top:'110%',background:'#1a1d22',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:4,minWidth:140,zIndex:50,boxShadow:'0 8px 24px rgba(0,0,0,0.4)'}}>
                        {isMe&&<>
                          <button onClick={()=>{setEditCommentId(c.id);setEditCommentText(c.content);setCmtMenu(null)}}
                            style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 12px',background:'none',border:'none',cursor:'pointer',color:'#fff',fontSize:12,borderRadius:7}}><Edit2 size={12} color="#10B981"/> Düzenle</button>
                          <button onClick={()=>deleteComment(c)}
                            style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 12px',background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:12,borderRadius:7}}><Trash2 size={12}/> Sil</button>
                        </>}
                        {!isMe&&<button onClick={()=>reportComment(c)}
                          style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 12px',background:'none',border:'none',cursor:'pointer',color:'#F59E0B',fontSize:12,borderRadius:7}}><Flag size={12}/> Şikayet Et</button>}
                      </motion.div>}
                    </AnimatePresence>
                  </div>
                </div>
                {editCommentId===c.id?(
                  <div>
                    <textarea value={editCommentText} onChange={e=>setEditCommentText(e.target.value)}
                      style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px',color:'#fff',fontSize:13,outline:'none',resize:'none',boxSizing:'border-box'}} rows={3}/>
                    <div style={{display:'flex',gap:6,marginTop:6}}>
                      <button onClick={()=>setEditCommentId(null)} style={{flex:1,padding:'6px',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)',border:'none',borderRadius:7,cursor:'pointer',fontSize:12}}>İptal</button>
                      <button onClick={()=>saveComment(c)} style={{flex:1,padding:'6px',background:'#10B981',color:'#fff',border:'none',borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:600}}>Kaydet</button>
                    </div>
                  </div>
                ):(
                  <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8}}>
                    <div className="fpc" style={{fontSize:13,lineHeight:1.5,flex:1}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(c.content)}}/>
                    <button onClick={()=>likeComment(c)} style={{display:'flex',alignItems:'center',gap:4,background:cLiked?'rgba(16,185,129,0.12)':'transparent',border:'none',borderRadius:8,padding:'3px 8px',cursor:'pointer',color:cLiked?'#10B981':'rgba(255,255,255,0.3)',fontSize:11,flexShrink:0}}>
                      <ThumbsUp size={11}/> {cLikes}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Comment input */}
      <div style={{padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.06)',background:'#111418',display:'flex',gap:8,alignItems:'center'}}>
        <input value={commentText} onChange={e=>setCommentText(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();addComment();}}}
          placeholder="Yorum yaz..."
          style={{flex:1,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'9px 14px',color:'#fff',fontSize:13,outline:'none'}}/>
        <button onClick={addComment} disabled={submitting||!commentText.trim()}
          style={{width:38,height:38,borderRadius:'50%',background:commentText.trim()?'#10B981':'rgba(255,255,255,0.07)',border:'none',cursor:commentText.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background 0.2s'}}>
          <Send size={16} color={commentText.trim()?'#fff':'rgba(255,255,255,0.3)'}/>
        </button>
      </div>
    </div>
  );
}

export const Forum = ({ theme, userId, displayName }: { theme: any; userId?: string; displayName?: string }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('Tümü');
  const [titleVal, setTitleVal] = useState('');
  const [contentVal, setContentVal] = useState('');
  const [categoryVal, setCategoryVal] = useState('Genel');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post|null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);

  const currentUserId = userId || auth.currentUser?.uid || '';
  const currentName = displayName || auth.currentUser?.displayName || 'Anonim';
  const [isVerified, setIsVerified] = useState(false);

  useEffect(()=>{
    if(!currentUserId) return;
    const vRef = ref(db,`users/${currentUserId}/is_verified`);
    onValue(vRef, snap => setIsVerified(!!snap.val()));
    return ()=>off(vRef);
  },[currentUserId]);

  useEffect(()=>{
    const r = ref(db,'forum');
    onValue(r,snap=>{
      const data = snap.val()||{};
      const list:Post[] = Object.entries(data).map(([id,val]:any)=>({
        id, author_id:val.author_id||val.userId||'', author_name:val.author_name||'',
        title:val.title||'', content:val.content||'', category:val.category||'Genel',
        created_at:val.created_at||0, likes:val.likes||{}, views:val.views||0,
        reply_count:val.reply_count||0, edited:val.edited||false,
      }));
      list.sort((a,b)=>b.created_at-a.created_at);
      setPosts(list);
    });
    return ()=>off(r);
  },[]);

  // Keep selectedPost in sync with live data
  useEffect(()=>{
    if(selectedPost){
      const updated = posts.find(p=>p.id===selectedPost.id);
      if(updated) setSelectedPost(updated);
    }
  },[posts]);

  // Load AI recommendations and trending topics
  useEffect(()=>{
    if(!currentUserId) return;
    const loadAIFeatures = async () => {
      try {
        const recs = await advancedForumService.getRecommendedPosts(currentUserId, 5);
        setAiRecommendations(recs);
        const topics = await advancedForumService.getTrendingTopics(10);
        setTrendingTopics(topics);
      } catch (error) {
        console.error('Failed to load AI features:', error);
      }
    };
    loadAIFeatures();
  },[currentUserId]);

  const handleLike = async (post:Post, e:React.MouseEvent)=>{
    e.stopPropagation();
    const r = ref(db,`forum/${post.id}/likes/${currentUserId}`);
    if(post.likes?.[currentUserId]) await remove(r);
    else await update(ref(db,`forum/${post.id}/likes`),{[currentUserId]:true});
  };

  const handleSubmit = async ()=>{
    if(!titleVal.trim()||!contentVal.trim()) return;
    setSubmitting(true);
    try {
      // AI Moderation check
      try {
        const moderation = await aiModerationService.analyzeContent(
          titleVal + ' ' + contentVal,
          currentUserId,
          'forum'
        );
        if (moderation.isViolation && moderation.confidence > 80) {
          alert(`İçerik politika ihlali tespit edildi: ${moderation.reasoning}\n\nGönderi engellenmiştir.`);
          setSubmitting(false);
          return;
        }
      } catch (modErr) {
        console.error('Moderation check failed, proceeding:', modErr);
      }

      // Create post with advanced service (fire and forget, don't block Firebase)
      advancedForumService.createPost(
        'general', currentUserId, currentName,
        titleVal.trim(), contentVal.trim(), 'text'
      ).catch(e => console.error('advancedForumService.createPost failed:', e));

      // Sync to Firebase (primary storage)
      await push(ref(db,'forum'),{
        title:titleVal.trim(), content:contentVal.trim(), category:categoryVal,
        userId:currentUserId, author_id:currentUserId, author_name:currentName,
        created_at:Date.now(), likes:{}, views:0, reply_count:0,
      });
      setTitleVal(''); setContentVal(''); setCategoryVal('Genel');
      setIsCreateModalOpen(false);
    } finally { setSubmitting(false); }
  };

  const filtered = posts.filter(p=> {
    const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCat === 'Tümü' || p.category === activeCat;
    return matchSearch && matchCat;
  });

  if(selectedPost) return <PostDetail post={selectedPost} currentUserId={currentUserId} currentName={currentName} onBack={()=>setSelectedPost(null)}/>;

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#0B0E11', backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',overflow:'hidden'}}>
      <div style={{padding:'16px 16px 10px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <MessageSquare size={20} color="#10B981"/>
            <span style={{fontWeight:700,fontSize:17,color:'#fff'}}>Forum</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
          {isVerified ? (
            <button onClick={()=>setIsCreateModalOpen(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'#10B981',border:'none',borderRadius:10,color:'#fff',fontWeight:600,fontSize:13,cursor:'pointer'}}>
              <Plus size={15}/> Yeni
            </button>
          ) : (
            <button onClick={()=>alert('Forum\'da paylaşım yapabilmek için hesabının doğrulanmış rozeti olması gerekiyor. Profil sayfasından rozet talebinde bulunabilirsin.')}
              style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'rgba(255,255,255,0.35)',fontWeight:600,fontSize:13,cursor:'pointer'}}
              title="Paylaşım yapmak için doğrulanmış rozet gerekli">
              <Plus size={15}/> Yeni
            </button>
          )}
          <button
            onClick={()=>setShowDashboard(v=>!v)}
            style={{
              display:'flex',alignItems:'center',gap:6,padding:'7px 12px',
              background: showDashboard ? '#8B5CF6' : 'rgba(139,92,246,0.15)',
              border: showDashboard ? 'none' : '1px solid rgba(139,92,246,0.3)',
              borderRadius:10,color:'#fff',fontWeight:600,fontSize:13,cursor:'pointer',transition:'all 0.2s'
            }}
            title="AI Dashboard"
          >
            <Brain size={15}/> Dashboard
          </button>
          </div>
        </div>
        <div style={{position:'relative'}}>
          <Search style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.3)'}} size={15}/>
          <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={t('common.search')}
            style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'8px 12px 8px 36px',color:'#fff',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
        </div>
        {/* Kategori filtreleri */}
        <div style={{display:'flex',gap:6,marginTop:10,overflowX:'auto',paddingBottom:2}}>
          {['Tümü',...CATS].map(cat=>(
            <button key={cat} onClick={()=>setActiveCat(cat)}
              style={{
                flexShrink:0, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', border:'none',
                background: activeCat===cat ? (CAT_COLORS[cat]||'#10B981') : 'rgba(255,255,255,0.06)',
                color: activeCat===cat ? '#fff' : 'rgba(255,255,255,0.45)',
                transition:'all .15s',
              }}>
              {cat==='Tümü' ? 'Tümü' : CAT_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'12px 14px'}}>
        <ForumAiAssistCard />
        {showDashboard && (
          <div style={{marginBottom:16}}>
            <ForumDashboard
              userId={currentUserId}
              username={currentName}
              onTopicSelect={(topic)=>setSearchQuery(topic)}
            />
          </div>
        )}
        {aiRecommendations.length > 0 && (
          <div style={{marginBottom:16,padding:12,background:'rgba(139,92,246,0.1)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:12}}>
            <div style={{fontSize:12,fontWeight:600,color:'#8B5CF6',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
              <Brain size={14}/> AI Önerileri
            </div>
            {aiRecommendations.map((rec,i)=>(
              <div key={rec.post?.id||i} onClick={()=>rec.post&&setSelectedPost(rec.post)}
                style={{cursor:'pointer',padding:8,background:'rgba(255,255,255,0.03)',borderRadius:8,marginBottom:4,transition:'background 0.2s'}}>
                <div style={{fontSize:13,color:'#fff',marginBottom:2}}>{rec.post?.title||'Öneri'}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{rec.reason}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
        {filtered.map(post=>{
          const likeCount = Object.values(post.likes||{}).filter(Boolean).length;
          const liked = !!post.likes?.[currentUserId];
          const catColor = CAT_COLORS[post.category]||'#8B5CF6';
          return (
            <motion.div key={post.id} whileHover={{y:-2,boxShadow:'0 8px 24px rgba(0,0,0,0.35)'}} whileTap={{scale:0.98}} onClick={()=>setSelectedPost(post)}
              style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'16px',cursor:'pointer',display:'flex',flexDirection:'column',gap:10,transition:'border-color 0.2s'}}>
              {/* Kategori + Tarih */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:11,fontWeight:600,color:catColor,background:catColor+'18',padding:'3px 10px',borderRadius:20}}>{CAT_LABELS[post.category]||post.category}</span>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.25)',display:'flex',alignItems:'center',gap:3}}><Clock size={9}/>{formatDate(post.created_at)}</span>
              </div>
              {/* Başlık */}
              <div style={{fontWeight:700,fontSize:14,color:'#fff',lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{post.title}</div>
              {/* Önizleme */}
              <div className="fpc" style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.55,flex:1,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}
                dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(post.content)}}/>
              {/* Alt bilgi */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:6,borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                <span
                  style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:500,cursor:'pointer'}}
                  onClick={e=>{e.stopPropagation();navigate(`/profile/${post.author_id}`);}}
                  onMouseEnter={e=>(e.currentTarget.style.color='#10B981')}
                  onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.35)')}
                >{post.author_name}</span>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.25)',display:'flex',alignItems:'center',gap:3}}><MessageSquare size={10}/>{post.reply_count||0}</span>
                  <button onClick={e=>handleLike(post,e)} style={{display:'flex',alignItems:'center',gap:4,background:liked?'rgba(16,185,129,0.15)':'transparent',border:'none',borderRadius:8,padding:'3px 8px',cursor:'pointer',color:liked?'#10B981':'rgba(255,255,255,0.35)',fontSize:12}}>
                    <ThumbsUp size={11}/>{likeCount}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        </div>
        {filtered.length===0&&<div style={{textAlign:'center',padding:40,color:'rgba(255,255,255,0.25)',fontSize:13}}>{t('forum.noPosts')}</div>}
      </div>

      <AnimatePresence>
        {isCreateModalOpen&&(
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{y:'100%',opacity:0}} animate={{y:0,opacity:1}} exit={{y:'100%',opacity:0}} transition={{type:'spring',damping:25}}
              style={{width:'100%',maxWidth:560,background:'#111418',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px 20px 0 0',padding:20,maxHeight:'90vh',overflowY:'auto'}}
              className="sm:rounded-2xl">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <span style={{fontWeight:700,fontSize:16,color:'#fff'}}>Yeni Tartışma</span>
                <button onClick={()=>setIsCreateModalOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)'}}><X size={20}/></button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <input value={titleVal} onChange={e=>setTitleVal(e.target.value)} placeholder="Başlık" maxLength={200}
                  style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 14px',color:'#fff',fontSize:13,outline:'none'}}/>
                <select value={categoryVal} onChange={e=>setCategoryVal(e.target.value)}
                  style={{background:'#1a1d22',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 14px',color:'#fff',fontSize:13,outline:'none'}}>
                  {CATS.map(c=><option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
                <RichEditor onChange={setContentVal}/>
                <div style={{display:'flex',gap:10,paddingTop:4}}>
                  <button onClick={()=>setIsCreateModalOpen(false)} style={{flex:1,padding:'11px 0',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.6)',border:'none',borderRadius:10,fontSize:13,cursor:'pointer'}}>Vazgeç</button>
                  <button onClick={handleSubmit} disabled={submitting||!titleVal.trim()||!contentVal.trim()}
                    style={{flex:1,padding:'11px 0',background:!titleVal.trim()||!contentVal.trim()?'rgba(59,130,246,0.4)':'#3B82F6',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                    {submitting?'Yayınlanıyor...':'Yayınla'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};