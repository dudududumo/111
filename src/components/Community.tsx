import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Trash2, 
  X,
  Plus,
  ShieldCheck
} from "lucide-react";
import { CommunityPost as CommunityPostType, UserProfile } from "../types";
import CommunityPost from './CommunityPost';

const TOPICS = [
  { id: 'all', name: '全部', icon: Users },
  { id: 'headteacher', name: '班主任心声', icon: Users },
  { id: 'subject', name: '学科教学', icon: MessageSquare },
  { id: 'mental', name: '心理健康', icon: Heart },
  { id: 'career', name: '职业发展', icon: MessageSquare }
];

interface CommunityProps {
  profile: UserProfile | null;
}

export const Community: React.FC<CommunityProps> = ({ profile }) => {
  const [posts, setPosts] = useState<CommunityPostType[]>([]);
  const [activeTopic, setActiveTopic] = useState('all');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("headteacher");
  const [selectedIdentities, setSelectedIdentities] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommunityPostType | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [comments, setComments] = useState<Record<string, any[]>>({});
  
  // Identity tags
  const IDENTITY_TAGS = [
    { id: 'headteacher', name: '班主任' },
    { id: 'chinese', name: '语文学科' },
    { id: 'math', name: '数学学科' },
    { id: 'english', name: '英语学科' },
    { id: 'other-subject', name: '其他学科' },
    { id: 'grade1', name: '一年级' },
    { id: 'grade2', name: '二年级' },
    { id: 'grade3', name: '三年级' },
    { id: 'grade4', name: '四年级' },
    { id: 'grade5', name: '五年级' },
    { id: 'grade6', name: '六年级' },
  ];

  // 统一的滚动和焦点保持器（高阶函数）
  const withScrollPreservation = async (action: () => Promise<void> | void) => {
    // 1. 记录当前精准滚动位置
    const currentY = window.scrollY;
    
    // 2. 剥夺当前焦点（防止元素被卸载时，浏览器因为找不到焦点而强行置顶）
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // 3. 执行核心逻辑
    await action();

    // 4. 延迟一小段时间，等待 React 渲染 DOM 后再恢复滚动位置
    setTimeout(() => {
      window.scrollTo({ top: currentY, behavior: 'instant' });
    }, 50);
  };

  // 修复1：初始化时必须同时加载帖子和评论
  React.useEffect(() => {
    const loadData = async () => {
      try {
        // 加载帖子
        const postsRes = await fetch('/api/community/posts', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPosts(await postsRes.json());

        // 加载评论 (确保刚进页面不刷新也能看到评论)
        const commentsRes = await fetch('/api/community/comments', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const commentsData = await commentsRes.json();
        const grouped: Record<string, any[]> = {};
        commentsData.forEach((c: any) => {
          // 兼容后端返回的下划线或驼峰命名
          const pid = c.post_id || c.postId;
          if (!grouped[pid]) grouped[pid] = [];
          grouped[pid].push(c);
        });
        setComments(grouped);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    };
    loadData();
  }, []);

  const handleSubmitPost = async (e?: React.FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!newPostContent.trim() || !profile) return;
    
    await withScrollPreservation(async () => {
      setIsSubmitting(true);
      try {
        const resp = await fetch('/api/community/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ content: newPostContent, topic: selectedTopic, identities: selectedIdentities })
        });
        
        if (resp.ok) {
          const newPost = await resp.json();
          // 纯净状态更新
          setPosts(prev => [newPost, ...prev]);
          setNewPostContent("");
          setShowNewPost(false);
        }
      } catch(e) {
        console.error("发布失败:", e);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleDeletePost = async (postId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!profile) return;
    
    await withScrollPreservation(async () => {
      try {
        const resp = await fetch(`/api/community/posts/${postId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (resp.ok) {
          setPosts(prev => prev.filter(post => post.id !== postId));
        }
      } catch(e) {
        console.error("Delete error:", e);
      }
    });
  };

  // 修复2：提交后直接静默触发一次 GET 请求
  const handleSubmitReply = async (e?: React.FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!replyContent.trim() || !profile || !replyingTo) return;

    await withScrollPreservation(async () => {
      setIsSubmitting(true);
      try {
        // 1. 发送回复
        const response = await fetch('/api/community/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ postId: replyingTo.id, content: replyContent })
        });

        if (response.ok) {
          // 2. 发送成功后，直接重新 GET 一遍所有评论
          // 这样就能保证和“手动刷新页面”拿到的完美数据一模一样！
          const commentsRes = await fetch('/api/community/comments', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const commentsData = await commentsRes.json();
          const grouped: Record<string, any[]> = {};
          commentsData.forEach((c: any) => {
            const pid = c.post_id || c.postId;
            if (!grouped[pid]) grouped[pid] = [];
            grouped[pid].push(c);
          });
          
          setComments(grouped);
          setReplyContent("");
          setReplyingTo(null);
        }
      } catch (err) {
        console.error("Failed to reply:", err);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* 侧边栏 */}
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-2">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">话题小组</h3>
          {TOPICS.map((topic) => (
            <button
              type="button"
              key={topic.id}
              onClick={() => {
                withScrollPreservation(() => {
                  setActiveTopic(topic.id);
                });
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTopic === topic.id ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-stone-500 hover:bg-stone-50'}`}
            >
              <topic.icon size={18} />
              {topic.name}
            </button>
          ))}
        </div>
        <button 
          type="button"
          onClick={() => setShowNewPost(true)}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
        >
          <Plus size={20} /> 发布心声
        </button>
      </div>

      {/* 帖子列表 */}
      <div className="lg:col-span-3 space-y-6">
        {posts.filter(p => activeTopic === 'all' || p.topic === activeTopic).map((post) => (
          <CommunityPost
            key={post.id}
            post={post}
            profile={profile}
            handleLike={() => {}}
            handleDeletePost={handleDeletePost}
            handleReply={setReplyingTo}
            comments={comments}
          />
        ))}
      </div>

      {/* 新发布弹窗 */}
      {showNewPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm">
          <div 
            onClick={() => setShowNewPost(false)} 
            className="absolute inset-0"
          />
          <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden z-10 max-h-[85vh] flex flex-col m-4">
            <div className="p-3 border-b border-stone-100 flex justify-between items-center">
              <h2 className="text-sm font-bold text-stone-900">发布心声</h2>
              <button 
                type="button"
                onClick={() => setShowNewPost(false)} 
                className="p-1.5 hover:bg-stone-50 rounded-xl transition-colors"
              >
                <X size={16} className="text-stone-400" />
              </button>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto flex-1">
              <div>
                <p className="text-xs font-bold text-stone-700 mb-1.5">选择身份标签</p>
                <div className="flex flex-wrap gap-1.5">
                  {IDENTITY_TAGS.map(tag => (
                    <button key={tag.id} onClick={() => setSelectedIdentities(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id])} className={`px-2 py-1 rounded-xl text-xs font-bold transition-all ${selectedIdentities.includes(tag.id) ? 'bg-blue-600 text-white' : 'bg-stone-50 text-stone-500'}`}>{tag.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-700 mb-1.5">选择话题</p>
                <div className="flex flex-wrap gap-1.5">
                  {TOPICS.filter(t => t.id !== 'all').map(topic => (
                    <button 
                      type="button"
                      key={topic.id} 
                      onClick={() => setSelectedTopic(topic.id)} 
                      className={`px-2 py-1 rounded-xl text-xs font-bold transition-all ${selectedTopic === topic.id ? 'bg-blue-600 text-white' : 'bg-stone-50 text-stone-500'}`}
                    >
                      {topic.name}
                    </button>
                  ))}
                </div>
              </div>
              <textarea 
                value={newPostContent} 
                onChange={(e) => setNewPostContent(e.target.value)} 
                placeholder="分享您的心声..." 
                className="w-full h-24 p-3 bg-stone-50 border border-stone-100 rounded-2xl outline-none resize-none text-stone-700 text-sm"
              />
            </div>
            <div className="p-3 bg-stone-50 flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => setShowNewPost(false)} 
                className="px-3 py-1.5 text-stone-500 font-bold rounded-2xl text-xs"
              >
                取消
              </button>
              <button 
                onClick={handleSubmitPost} 
                disabled={isSubmitting || !newPostContent.trim()} 
                type="button"
                className="px-5 py-1.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 text-xs"
              >
                确认发布
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 回复弹窗 */}
      {replyingTo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm">
          <div 
            onClick={() => setReplyingTo(null)} 
            className="absolute inset-0"
          />
          <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden z-10 max-h-[80vh] flex flex-col m-4">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-stone-900">回复心声</h2>
              <button 
                type="button"
                onClick={() => setReplyingTo(null)} 
                className="p-2 hover:bg-stone-50 rounded-xl transition-colors"
              >
                <X size={18} className="text-stone-400" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 text-sm text-stone-600 italic">"{replyingTo.content}"</div>
              <textarea 
                value={replyContent} 
                onChange={(e) => setReplyContent(e.target.value)} 
                placeholder="写下您的回复..." 
                className="w-full h-32 p-4 bg-stone-50 border border-stone-100 rounded-2xl outline-none resize-none text-stone-700 text-sm"
              />
            </div>
            <div className="p-4 bg-stone-50 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setReplyingTo(null)} 
                className="px-4 py-2 text-stone-500 font-bold rounded-2xl"
              >
                取消
              </button>
              <button 
                onClick={handleSubmitReply} 
                disabled={isSubmitting || !replyContent.trim()}
                type="button"
                className="px-6 py-2 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100"
              >
                确认回复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};