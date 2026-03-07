import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Flag, 
  Search, 
  Plus, 
  Send, 
  ShieldCheck, 
  Info,
  X,
  ChevronRight,
  MoreHorizontal,
  Filter,
  AlertCircle
} from "lucide-react";
import { UserProfile, CommunityPost } from "../types";
import { db } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";

interface CommunityProps {
  profile: UserProfile | null;
}

const TOPICS = [
  { id: 'all', name: '全部动态', icon: Users },
  { id: 'headteacher', name: '班主任心声', icon: MessageSquare },
  { id: 'communication', name: '家校沟通艺术', icon: ShieldCheck },
  { id: 'growth', name: '专业成长', icon: Info },
  { id: 'life', name: '生活点滴', icon: Heart },
];

const Community: React.FC<CommunityProps> = ({ profile }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeTopic, setActiveTopic] = useState('all');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("headteacher");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityPost)));
    });
    return () => unsubscribe();
  }, []);

  const handleLike = async (post: CommunityPost) => {
    if (!profile || !post.id) return;
    const postRef = doc(db, "posts", post.id);
    const isLiked = post.likedBy?.includes(profile.uid);
    
    await updateDoc(postRef, {
      likes: isLiked ? post.likes - 1 : post.likes + 1,
      likedBy: isLiked ? arrayRemove(profile.uid) : arrayUnion(profile.uid)
    });
  };

  const handleSubmitPost = async () => {
    if (!newPostContent.trim() || !profile) return;
    setIsSubmitting(true);
    setModerationError(null);

    try {
      // Mock NLP Moderation Check
      const sensitiveKeywords = ["自杀", "去死", "杀人", "暴力", "色情"];
      const hasSensitive = sensitiveKeywords.some(kw => newPostContent.includes(kw));

      if (hasSensitive) {
        setModerationError("内容包含敏感词汇，请修改后重新发布。我们希望维护一个积极、支持性的社区环境。");
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(db, "posts"), {
        authorId: profile.uid,
        content: newPostContent,
        topic: selectedTopic,
        likes: 0,
        likedBy: [],
        isFlagged: false,
        timestamp: new Date().toISOString()
      });

      setNewPostContent("");
      setShowNewPost(false);
    } catch (err) {
      console.error("Failed to post:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPosts = activeTopic === 'all' 
    ? posts 
    : posts.filter(p => p.topic === activeTopic);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
            <Users className="text-orange-500" size={32} />
            橙色干预：匿名支持社区
          </h1>
          <p className="text-stone-500 mt-1">在这里，您可以卸下身份，与同行分享心声，获得温暖支持</p>
        </div>
        <button 
          onClick={() => setShowNewPost(true)}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all active:scale-95"
        >
          <Plus size={20} /> 发布心声
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Topics */}
        <div className="space-y-2">
          <h3 className="px-4 text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">话题小组</h3>
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setActiveTopic(topic.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTopic === topic.id ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-stone-500 hover:bg-stone-50'}`}
            >
              <topic.icon size={18} />
              {topic.name}
              {activeTopic === topic.id && <motion.div layoutId="active-pill" className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-500" />}
            </button>
          ))}
          
          <div className="mt-8 p-6 bg-stone-900 rounded-3xl text-white space-y-4">
            <ShieldCheck className="text-orange-400" size={24} />
            <h4 className="font-bold">社区公约</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              1. 保持匿名，保护隐私<br/>
              2. 友善互动，拒绝网暴<br/>
              3. 积极引导，共同成长
            </p>
          </div>
        </div>

        {/* Feed */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm hover:shadow-md transition-all space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">匿名教师</p>
                      <p className="text-[10px] text-stone-400 font-medium">{new Date(post.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-stone-50 text-stone-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {TOPICS.find(t => t.id === post.topic)?.name}
                    </span>
                    <button className="p-2 text-stone-300 hover:text-stone-600 transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </div>

                <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>

                <div className="flex items-center gap-6 pt-4 border-t border-stone-50">
                  <button 
                    onClick={() => handleLike(post)}
                    className={`flex items-center gap-2 text-sm font-bold transition-colors ${post.likedBy?.includes(profile?.uid || '') ? 'text-orange-600' : 'text-stone-400 hover:text-orange-600'}`}
                  >
                    <Heart size={18} fill={post.likedBy?.includes(profile?.uid || '') ? "currentColor" : "none"} />
                    {post.likes}
                  </button>
                  <button className="flex items-center gap-2 text-sm font-bold text-stone-400 hover:text-stone-600 transition-colors">
                    <MessageSquare size={18} />
                    回复
                  </button>
                  <button className="ml-auto flex items-center gap-2 text-sm font-bold text-stone-300 hover:text-rose-500 transition-colors">
                    <Flag size={18} />
                    举报
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredPosts.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="h-20 w-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-200">
                <MessageSquare size={40} />
              </div>
              <p className="text-stone-400 font-medium">暂无动态，快来发布第一条心声吧</p>
            </div>
          )}
        </div>
      </div>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewPost(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-stone-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">发布心声</h2>
                  <p className="text-stone-500 text-sm">您的身份将被完全隐藏，请放心分享</p>
                </div>
                <button onClick={() => setShowNewPost(false)} className="p-2 hover:bg-stone-50 rounded-xl transition-colors">
                  <X size={24} className="text-stone-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">选择话题小组</label>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.filter(t => t.id !== 'all').map(topic => (
                      <button
                        key={topic.id}
                        onClick={() => setSelectedTopic(topic.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedTopic === topic.id ? 'bg-orange-600 text-white shadow-md' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'}`}
                      >
                        {topic.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">内容</label>
                  <textarea 
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="分享您的心声、困惑或感悟..."
                    className="w-full h-48 p-6 bg-stone-50 border border-stone-100 rounded-3xl focus:ring-2 focus:ring-orange-200 outline-none resize-none text-stone-700"
                  />
                </div>

                {moderationError && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-600"
                  >
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-xs font-medium leading-relaxed">{moderationError}</p>
                  </motion.div>
                )}
              </div>

              <div className="p-8 bg-stone-50 flex justify-end gap-4">
                <button onClick={() => setShowNewPost(false)} className="px-6 py-2 text-stone-500 font-bold hover:text-stone-700">取消</button>
                <button 
                  onClick={handleSubmitPost}
                  disabled={isSubmitting || !newPostContent.trim()}
                  className="px-10 py-3 bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? "发布中..." : <><Send size={18} /> 确认发布</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Community;
