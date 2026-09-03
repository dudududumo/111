import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, Heart, MessageSquare, Trash2 } from 'lucide-react';

interface CommunityPostProps {
  post: any;
  profile: any;
  handleLike: (post: any) => void;
  handleDeletePost: (postId: string, e: React.MouseEvent) => void;
  handleReply: (post: any) => void;
  comments: any;
}

const CommunityPost: React.FC<CommunityPostProps> = ({ post, profile, handleLike, handleDeletePost, handleReply, comments }) => {
  return (
    <motion.div
      key={post.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 sm:p-8 rounded-[32px] border border-stone-100 shadow-sm space-y-6"
    >
      <div className="relative">
        {/* 主题标签 - 右上角 */}
        <div className="absolute top-0 right-0">
          {post.topic && post.topic.trim() !== '' && (
            <span className="px-2 py-1 bg-stone-50 text-stone-500 text-[10px] font-bold rounded-md whitespace-nowrap">
              {post.topic}
            </span>
          )}
        </div>
        
        {/* 头像和用户信息 */}
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${post.isModerator ? 'bg-blue-100 text-blue-600' : 'bg-stone-100 text-stone-400'}`}>
            {post.isModerator ? <ShieldCheck size={20} /> : <Users size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            {/* 第一排：昵称 */}
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-stone-900">{Boolean(post.isModerator) ? "社区专家" : "匿名教师"}</p>
                      {Boolean(post.isModerator) && <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-md uppercase">Mod</span>}
                    </div>
                    
                    {/* 第二排：身份标签 */}
                    {Array.isArray(post.identities) && post.identities.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mb-1">
                        {post.identities.map((identity: string) => (
                          <span key={identity} className="px-2 py-1 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-md mr-1">{identity}</span>
                        ))}
                      </div>
                    )}
                    
                    {/* 第三排：日期 */}
                    <p className="text-[12px] text-stone-400 font-medium">{post.timestamp ? new Date(post.timestamp.replace(' ', 'T')).toLocaleString() : ''}</p>
          </div>
        </div>
        
        {/* 删除按钮 - 右下角 */}
        {post.authorId === profile?.uid && (
          <div className="absolute bottom-0 right-0">
            <button 
              type="button"
              onClick={(e) => handleDeletePost(post.id, e)}
              className="p-2 text-stone-300 hover:text-rose-500 transition-colors"
              title="删除我的发布"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="prose prose-stone max-w-none">
        <p className="text-stone-700 leading-relaxed whitespace-pre-wrap text-base sm:text-sm">{post.content}</p>
      </div>

      <div className="flex items-center gap-6 pt-4 border-t border-stone-50">
        <button 
          type="button"
          className="flex items-center gap-2 text-stone-400 hover:text-rose-500 transition-colors"
          onClick={() => handleLike(post)}
        >
          <Heart size={18} />
          <span className="text-xs font-bold">{post.likes}</span>
        </button>
        <button 
          type="button"
          className="flex items-center gap-2 text-stone-400 hover:text-blue-500 transition-colors"
          onClick={() => handleReply(post)}
        >
          <MessageSquare size={18} />
          <span className="text-xs font-bold">回复</span>
        </button>
      </div>

      {/* 评论列表 */}
      <div className="space-y-4 pt-4 border-t border-stone-50">
        {comments[post.id] && comments[post.id].map((comment: any) => (
          <div key={comment.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${comment.is_moderator ? 'bg-blue-100 text-blue-600' : 'bg-stone-100 text-stone-400'}`}>
                  {comment.is_moderator ? <ShieldCheck size={16} /> : <Users size={16} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">{comment.is_moderator ? "社区专家" : "匿名教师"}</p>
                  <p className="text-[9px] text-stone-400 font-medium">
                    {comment.timestamp ? new Date(comment.timestamp.replace(' ', 'T')).toLocaleTimeString() : ''}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default CommunityPost;