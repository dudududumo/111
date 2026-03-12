import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wind, 
  Clock, 
  Trash2, 
  LayoutGrid, 
  Music, 
  BookOpen, 
  Heart, 
  ShieldCheck,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Save,
  ArrowRight,
  Volume2,
  VolumeX,
  X,
  Send,
  Activity,
  Pause,
  Info,
  Mic,
  Image as ImageIcon,
  TrendingUp,
  MessageSquare,
  Users,
  Calendar
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { UserProfile, ToolUsage, DiaryEntry, Task, CommunityPost } from "../types";
import { db } from "../firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc, getDoc, getDocs, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";

interface ToolkitProps {
  profile: UserProfile | null;
}

const Toolkit: React.FC<ToolkitProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'community'>('tools');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Community State
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeTopic, setActiveTopic] = useState('all');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("headteacher");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<CommunityPost | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [comments, setComments] = useState<Record<string, any[]>>({});

  const TOPICS = [
    { id: 'all', name: '全部动态', icon: Users },
    { id: 'headteacher', name: '班主任心声', icon: MessageSquare },
    { id: 'communication', name: '家校沟通艺术', icon: ShieldCheck },
    { id: 'growth', name: '专业成长', icon: Info },
    { id: 'life', name: '生活点滴', icon: Heart },
  ];

  // 3x3 Breathing State
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathCount, setBreathCount] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const breathAudioRef = useRef<HTMLAudioElement | null>(null);

  // Reset states when tool changes
  useEffect(() => {
    if (activeTool === 'breathing') {
      setBreathCount(0);
      setBreathPhase('inhale');
    }
    if (activeTool === 'boundaries') {
      setCurrentScenario(0);
      setBoundaryFeedback(null);
      setSelectedOption(null);
    }
    if (activeTool === 'pause') setPauseTimer(60);
  }, [activeTool]);

  // Emotional Pause State
  const [pauseTimer, setPauseTimer] = useState(60);
  const [isPauseActive, setIsPauseActive] = useState(false);

  // Anxiety Box State
  const [anxietyText, setAnxietyText] = useState("");
  const [isBoxClosed, setIsBoxClosed] = useState(false);
  const [processingTime, setProcessingTime] = useState("今晚");
  const [isRecording, setIsRecording] = useState(false);

  // Mindfulness State
  const [selectedAudio, setSelectedAudio] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedAudio) return;

    if (isPlaying) {
      // Ensure the audio element has the correct source and is loaded
      if (audio.src !== selectedAudio.url) {
        audio.src = selectedAudio.url;
        audio.load();
      }
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name !== 'AbortError') {
            console.error("播放失败:", err.message);
            setIsPlaying(false);
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [selectedAudio, isPlaying]);

  // Boundary Card State
  const [currentScenario, setCurrentScenario] = useState(0);
  const [boundaryFeedback, setBoundaryFeedback] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Favorites State
  const [favorites, setFavorites] = useState<string[]>([]);

  const mindfulnessTracks = [
    { id: 'm1', title: '清晨唤醒：开启元气一天', duration: '02:36', category: '晨间', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 'm2', title: '身心合一：深度瑜伽冥想', duration: '05:12', category: '瑜伽', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { id: 'm3', title: '内在宁静：消除焦虑杂念', duration: '04:45', category: '冥想', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { id: 'm4', title: '星空入梦：助眠白噪音', duration: '06:20', category: '助眠', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
    { id: 'm5', title: '温柔抚慰：情绪急救包', duration: '03:50', category: '放松', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
    { id: 'm6', title: '禅意空间：流水与蝉鸣', duration: '04:15', category: '静心', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
    { id: 'm7', title: '宇宙共鸣：灵性觉醒时刻', duration: '02:55', category: '灵性', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
    { id: 'm8', title: '环境节拍：高效工作背景', duration: '03:10', category: '节奏', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
    { id: 'm9', title: '木吉他之语：午后舒缓时光', duration: '03:40', category: '舒缓', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
  ];

  const boundaryScenarios = [
    {
      id: 1,
      context: "周日晚上8点，家长在微信群询问下周的作业安排。",
      options: [
        { text: "立即回复并详细解释", feedback: "这会模糊你的私人时间边界，建议设定自动回复或在工作时间处理。", type: 'weak' },
        { text: "周一早上8点统一回复", feedback: "非常棒！明确了非工作时间不处理非紧急事务的边界。", type: 'strong' },
        { text: "回复：请看群公告", feedback: "虽然设定了边界，但语气略显生硬，可以更温和一些。", type: 'neutral' }
      ]
    },
    {
      id: 2,
      context: "同事请求你帮他代一节课，而你已经连续上了三节课，感到精疲力竭。",
      options: [
        { text: "委婉拒绝并说明原因", feedback: "正确。保护自己的精力是长期工作的基石，诚实表达困难并不丢人。", type: 'strong' },
        { text: "勉强答应，但心里很不舒服", feedback: "长期压抑会导致职业倦怠，学会拒绝是必要的自我保护。", type: 'weak' },
        { text: "直接不回消息", feedback: "冷处理虽然避开了冲突，但可能影响同事关系，建议礼貌回应。", type: 'neutral' }
      ]
    },
    {
      id: 3,
      context: "领导在工作群@你，希望你能在假期期间完成一份非紧急的报告。",
      options: [
        { text: "收到，我会尽快完成", feedback: "这会向领导传递你随时待命的信号，长此以往会侵占休息时间。", type: 'weak' },
        { text: "回复：收到，我会在假期结束后的第一个工作日处理", feedback: "非常专业！既确认了消息，又明确了假期的不可侵犯性。", type: 'strong' },
        { text: "假装没看见，等假期结束再说", feedback: "虽然保护了假期，但缺乏沟通可能导致工作堆积或误解。", type: 'neutral' }
      ]
    },
    {
      id: 4,
      context: "一位家长在私人微信上向你抱怨其他老师的教学方式。",
      options: [
        { text: "附和家长的观点", feedback: "这违反了职业道德，且容易卷入不必要的职场纷争。", type: 'weak' },
        { text: "礼貌引导家长通过正式渠道或直接与该老师沟通", feedback: "明智的选择。维护了同事关系，也划清了沟通的专业边界。", type: 'strong' },
        { text: "不发表评论，只听不说", feedback: "虽然避开了风险，但没有积极引导，家长可能继续纠缠。", type: 'neutral' }
      ]
    },
    {
      id: 5,
      context: "下班后，你收到一位家长的语音通话请求，讨论孩子的琐碎表现。",
      options: [
        { text: "接听并聊上半小时", feedback: "这会消耗你宝贵的休息时间。建议引导至文字沟通或预约面谈。", type: 'weak' },
        { text: "挂断并回复：现在不方便，请在工作时间联系我", feedback: "虽然明确了边界，但可以直接说明非紧急情况请留言。", type: 'neutral' },
        { text: "回复文字：现在是私人休息时间，如有紧急情况请留言，否则我将在明天工作时间回复", feedback: "非常棒。既体现了责任心，又坚守了个人生活空间。", type: 'strong' }
      ]
    },
    {
      id: 6,
      context: "学校要求老师在个人朋友圈转发学校的宣传推文，你并不想这样做。",
      options: [
        { text: "默默转发并设置分组可见", feedback: "这是一种妥协。你有权决定个人社交媒体的内容。", type: 'neutral' },
        { text: "不予理会，坚持朋友圈的个人属性", feedback: "勇敢的边界设定。个人空间不应被强制职业化。", type: 'strong' },
        { text: "在群里公开质疑这项要求", feedback: "虽然表达了不满，但可能引发不必要的冲突，建议私下沟通或冷处理。", type: 'weak' }
      ]
    },
    {
      id: 7,
      context: "一位家长在家长会上公开质疑你的教学水平，语气带有攻击性。",
      options: [
        { text: "当场反驳并与其争吵", feedback: "这会破坏你的专业形象。建议保持冷静，引导至会后私下沟通。", type: 'weak' },
        { text: "保持礼貌，建议会后单独详细讨论，并感谢其关注", feedback: "非常专业的处理方式。既维护了会场秩序，又展现了开放的态度。", type: 'strong' },
        { text: "沉默不语，任由其指责", feedback: "过度退让可能让其他家长产生误解，建议适度回应以维护专业尊严。", type: 'neutral' }
      ]
    },
    {
      id: 8,
      context: "同事经常在办公室大声谈论私人电话，严重干扰了你的备课工作。",
      options: [
        { text: "忍气吞声，戴上耳机", feedback: "虽然暂时解决了问题，但长期会积累怨气。建议友好沟通。", type: 'neutral' },
        { text: "私下委婉地提醒同事，说明自己需要安静的环境备课", feedback: "正确的做法。清晰表达需求是建立健康职场边界的第一步。", type: 'strong' },
        { text: "在办公室大声抱怨环境嘈杂", feedback: "被动攻击的方式往往会激化矛盾，不利于同事关系的维护。", type: 'weak' }
      ]
    }
  ];

  const dailyCards = [
    {
      quote: "“每一个不曾起舞的日子，都是对生命的辜负。”",
      author: "尼采",
      practice: "感恩三件事：写下今天让你感到温暖的三个瞬间。"
    },
    {
      quote: "“生活不是等待暴风雨过去，而是学会在雨中跳舞。”",
      author: "维维安·格林",
      practice: "自我肯定：对着镜子对自己说三句赞美的话。"
    },
    {
      quote: "“你无法阻止波浪，但你可以学会冲浪。”",
      author: "乔·卡巴金",
      practice: "正念观察：花一分钟观察窗外的一棵树或一朵云。"
    },
    {
      quote: "“教育的本质是一棵树摇动另一棵树，一朵云推动另一朵云。”",
      author: "雅斯贝尔斯",
      practice: "连接他人：给一位久未联系的朋友发一条问候短信。"
    },
    {
      quote: "“即使是在最黑暗的时刻，也可以发现幸福，只要有人记得点亮光。”",
      author: "邓布利多",
      practice: "寻找微光：记录今天工作中一个微小但成功的时刻。"
    },
    {
      quote: "“慢下来，你会发现生活的美好往往就在那些被忽略的间隙。”",
      author: "林清玄",
      practice: "慢行练习：用比平时慢一半的速度走一段路，感受脚掌着地的感觉。"
    },
    {
      quote: "“我们无法改变风向，但可以调整风帆。”",
      author: "亚里士多德",
      practice: "灵活应对：想出一件最近让你烦恼的事，并试着从积极的角度去解读它。"
    }
  ];

  const dailyCard = dailyCards[new Date().getDate() % dailyCards.length];

  // Diary State
  const [newDiary, setNewDiary] = useState({ content: "", mood: 5, tags: [] as string[], imageUrl: "" });
  const [showMoodCurve, setShowMoodCurve] = useState(false);

  // Task State
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedQuadrant, setSelectedQuadrant] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    if (!profile) return;

    const diaryQuery = query(
      collection(db, "diaries"),
      where("uid", "==", profile.uid)
    );
    const unsubscribeDiary = onSnapshot(diaryQuery, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaryEntry));
      setDiaryEntries(loaded.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "diaries");
    });

    const taskQuery = query(
      collection(db, "tasks"),
      where("uid", "==", profile.uid)
    );
    const unsubscribeTasks = onSnapshot(taskQuery, (snapshot) => {
      const loadedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(loadedTasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "tasks");
    });

    // Load favorites
    const loadFavorites = async () => {
      const favRef = doc(db, "users", profile.uid);
      try {
        const snap = await getDoc(favRef);
        if (snap.exists()) {
          setFavorites(snap.data().favoriteTools || []);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${profile.uid}`);
      }
    };
    
    loadFavorites();

    // Community Listeners
    const postsQuery = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityPost)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "posts");
    });

    const commentsQuery = query(collection(db, "comments"), orderBy("timestamp", "asc"));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const allComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const grouped: Record<string, any[]> = {};
      allComments.forEach((c: any) => {
        if (!grouped[c.postId]) grouped[c.postId] = [];
        grouped[c.postId].push(c);
      });
      setComments(grouped);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "comments");
    });

    return () => {
      unsubscribeDiary();
      unsubscribeTasks();
      unsubscribePosts();
      unsubscribeComments();
    };
  }, [profile]);

  const toggleFavorite = async (toolId: string) => {
    if (!profile) return;
    const newFavs = favorites.includes(toolId) 
      ? favorites.filter(id => id !== toolId)
      : [...favorites, toolId];
    
    setFavorites(newFavs);
    await updateDoc(doc(db, "users", profile.uid), { favoriteTools: newFavs });
  };

  const logToolUsage = async (toolId: string, duration?: number, feeling?: 'better' | 'same' | 'worse') => {
    if (!profile) return;
    try {
      const data: any = {
        uid: profile.uid,
        toolId,
        timestamp: new Date().toISOString()
      };
      
      if (duration !== undefined) data.duration = duration;
      if (feeling !== undefined) data.feeling = feeling;

      await addDoc(collection(db, "tool_usage"), data);
    } catch (err) {
      console.error("Failed to log tool usage:", err instanceof Error ? err.message : String(err));
    }
  };

  // Breathing Logic
  useEffect(() => {
    if (activeTool !== 'breathing') {
      if (breathAudioRef.current) {
        breathAudioRef.current.pause();
        breathAudioRef.current.currentTime = 0;
      }
      return;
    }
    
    if (!isMuted && breathAudioRef.current) {
      const playPromise = breathAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError') {
            console.warn("Breathing audio play blocked or failed:", e.message);
          }
        });
      }
    } else if (breathAudioRef.current) {
      breathAudioRef.current.pause();
    }

    const interval = setInterval(() => {
      setBreathPhase(current => {
        // 震动反馈
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }
        if (current === 'inhale') return 'hold';
        if (current === 'hold') return 'exhale';
        // 只有在 exhale 结束时增加计数
        return 'inhale';
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, [activeTool, isMuted]);

  // Separate counter to avoid double-triggering in state updates
  useEffect(() => {
    if (activeTool === 'breathing' && breathPhase === 'inhale') {
      setBreathCount(prev => prev + 1);
    }
  }, [breathPhase, activeTool]);

  // The first 'inhale' on mount should start at 0 or handle offset
  useEffect(() => {
    if (activeTool === 'breathing') setBreathCount(0);
  }, [activeTool]);

  // Pause Timer Logic
  useEffect(() => {
    if (!isPauseActive || pauseTimer <= 0) {
      if (pauseTimer === 0) {
        setIsPauseActive(false);
        logToolUsage('emotional-pause', 60, 'better');
      }
      return;
    }
    const timer = setTimeout(() => setPauseTimer(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [isPauseActive, pauseTimer]);

  const tools = [
    { id: 'breathing', title: '3×3 呼吸引导', icon: Wind, color: 'bg-blue-500', desc: '动画引导腹式呼吸，平复心境' },
    { id: 'pause', title: '情绪暂停角', icon: Clock, color: 'bg-indigo-500', desc: '60秒冷静空间，阻断负面情绪' },
    { id: 'anxiety-box', title: '焦虑收纳箱', icon: Trash2, color: 'bg-stone-500', desc: '将烦恼“扔”进箱子，设定处理时间' },
    { id: 'quadrants', title: '四象限工作法', icon: LayoutGrid, color: 'bg-emerald-500', desc: '科学分类任务，缓解工作焦虑' },
    { id: 'mindfulness', title: '正念音频库', icon: Music, color: 'bg-violet-500', desc: '3-15分钟引导式冥想课程' },
    { id: 'diary', title: '情绪日记本', icon: BookOpen, color: 'bg-amber-500', desc: '记录每日心情，生成波动曲线' },
    { id: 'cards', title: '积极心理卡片', icon: Heart, color: 'bg-rose-500', desc: '每日感恩练习与心理名言' },
    { id: 'boundaries', title: '沟通边界卡', icon: ShieldCheck, color: 'bg-teal-500', desc: '情景模拟练习，设定工作边界' },
  ];

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !profile) return;
    try {
      await addDoc(collection(db, "tasks"), {
        uid: profile.uid,
        title: newTaskTitle,
        quadrant: selectedQuadrant,
        completed: false,
        createdAt: new Date().toISOString()
      });
      setNewTaskTitle("");
    } catch (err) {
      console.error("Failed to add task:", err instanceof Error ? err.message : String(err));
    }
  };

  const clearCompletedTasks = async () => {
    const completedTasks = tasks.filter(t => t.completed);
    for (const task of completedTasks) {
      await deleteDoc(doc(db, "tasks", task.id));
    }
  };

  const toggleTask = async (task: any) => {
    await updateDoc(doc(db, "tasks", task.id), {
      completed: !task.completed
    });
  };

  // Community Handlers
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
      const sensitiveKeywords = ["自杀", "去死", "杀人", "暴力", "色情"];
      const hasSensitive = sensitiveKeywords.some(kw => newPostContent.includes(kw));

      if (hasSensitive) {
        setModerationError("内容包含敏感词汇，请修改后重新发布。");
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

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !profile || !replyingTo) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "comments"), {
        postId: replyingTo.id,
        authorId: profile.uid,
        content: replyContent,
        isModerator: profile.role === 'psychologist' || profile.role === 'admin',
        timestamp: new Date().toISOString()
      });
      setReplyContent("");
      setReplyingTo(null);
    } catch (err) {
      console.error("Failed to reply:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDiary = async () => {
    if (!newDiary.content.trim() || !profile) return;
    await addDoc(collection(db, "diaries"), {
      uid: profile.uid,
      content: newDiary.content,
      mood: newDiary.mood,
      tags: newDiary.tags,
      imageUrl: newDiary.imageUrl,
      timestamp: new Date().toISOString()
    });
    setNewDiary({ content: "", mood: 5, tags: [], imageUrl: "" });
    logToolUsage('diary', undefined, 'better');
  };

  const handleDeleteDiary = async (id: string) => {
    try {
      await deleteDoc(doc(db, "diaries", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `diaries/${id}`);
    }
  };

  // Speech to Text Logic
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("您的浏览器不支持语音识别功能，请尝试使用 Chrome 或 Edge。");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAnxietyText(prev => prev + (prev ? " " : "") + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const handleDeletePost = async (postId: string) => {
    if (!profile) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      // Also delete comments
      const q = query(collection(db, "comments"), where("postId", "==", postId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "comments", d.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
            <Wind className="text-blue-500" size={32} />
            蓝色调适：心晴驿站
          </h1>
          <p className="text-stone-500 mt-1">数字化心理工具包与匿名支持社区</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-stone-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('tools')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'tools' ? 'bg-blue-500 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
          >
            心理工具包
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'community' ? 'bg-blue-500 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
          >
            匿名社区
          </button>
        </div>
      </div>

      {activeTab === 'tools' ? (
        <>
          {/* Tools Grid */}
          {!activeTool ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tools.map((tool) => (
            <motion.div
              key={tool.id}
              whileHover={{ y: -5 }}
              className="relative group"
            >
              <button
                onClick={() => setActiveTool(tool.id)}
                className="w-full h-full flex flex-col items-start p-6 bg-white rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all text-left"
              >
                <div className={`h-12 w-12 rounded-2xl ${tool.color} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <tool.icon size={24} />
                </div>
                <h3 className="font-bold text-stone-900 mb-2">{tool.title}</h3>
                <p className="text-xs text-stone-500 leading-relaxed">{tool.desc}</p>
                <div className="mt-4 flex items-center text-xs font-bold text-stone-400 group-hover:text-stone-900 transition-colors">
                  开始使用 <ChevronRight size={14} />
                </div>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleFavorite(tool.id); }}
                className={`absolute top-4 right-4 p-2 rounded-xl transition-all ${favorites.includes(tool.id) ? 'text-amber-500 bg-amber-50' : 'text-stone-300 hover:text-amber-500 hover:bg-stone-50'}`}
              >
                <Heart size={16} fill={favorites.includes(tool.id) ? "currentColor" : "none"} />
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-stone-100 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
          {/* Tool Header */}
          <div className="p-6 border-b border-stone-50 flex items-center justify-between bg-stone-50/50">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveTool(null)}
                className="p-2 hover:bg-white rounded-xl transition-colors text-stone-400 hover:text-stone-900"
              >
                <X size={24} />
              </button>
              <h2 className="text-xl font-bold text-stone-900">
                {tools.find(t => t.id === activeTool)?.title}
              </h2>
            </div>
            {activeTool === 'breathing' && (
              <div className="flex items-center gap-2">
                <audio 
                  ref={breathAudioRef} 
                  loop 
                  src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
                  onError={() => {
                    console.warn("Breathing audio failed to load");
                    setIsMuted(true);
                  }}
                />
                <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white rounded-xl transition-colors text-stone-400">
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              </div>
            )}
          </div>

          {/* Tool Content */}
          <div className="flex-1 p-8 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {activeTool === 'breathing' && (
                <motion.div 
                  key="breathing"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center space-y-12"
                >
                  <div className="relative flex items-center justify-center">
                    <motion.div 
                      animate={{ 
                        scale: breathPhase === 'inhale' ? 1.5 : (breathPhase === 'exhale' ? 1 : 1.5),
                        opacity: breathPhase === 'hold' ? 0.8 : 1
                      }}
                      transition={{ duration: 3, ease: "easeInOut" }}
                      className="h-48 w-48 rounded-full bg-blue-500/20 flex items-center justify-center"
                    >
                      <motion.div 
                        animate={{ 
                          scale: breathPhase === 'inhale' ? 1.2 : (breathPhase === 'exhale' ? 0.8 : 1.2)
                        }}
                        transition={{ duration: 3, ease: "easeInOut" }}
                        className="h-32 w-32 rounded-full bg-blue-500 shadow-2xl shadow-blue-200"
                      />
                    </motion.div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white drop-shadow-md uppercase tracking-widest">
                        {breathPhase === 'inhale' ? '吸气' : (breathPhase === 'hold' ? '屏息' : '呼气')}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-stone-400 font-medium">已完成 {breathCount} 组循环</p>
                    <p className="text-stone-500 text-sm">跟随圆圈的节奏，深度放松你的身心</p>
                  </div>
                </motion.div>
              )}

              {activeTool === 'pause' && (
                <motion.div 
                  key="pause"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-8 max-w-md"
                >
                  {!isPauseActive && pauseTimer === 60 ? (
                    <>
                      <div className="h-32 w-32 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                        <Clock size={64} />
                      </div>
                      <h3 className="text-2xl font-bold text-stone-900">情绪暂停角</h3>
                      <p className="text-stone-500">当感到愤怒、焦虑或压力过大时，给自己60秒的留白时间。</p>
                      <button 
                        onClick={() => setIsPauseActive(true)}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                      >
                        立即开始 (60s)
                      </button>
                    </>
                  ) : (
                    <div className="space-y-8">
                      <div className="text-8xl font-black text-stone-900 tabular-nums">
                        {pauseTimer}s
                      </div>
                      <p className="text-stone-500 italic">“在刺激和反应之间，有一个空间。在那个空间里，我们有选择反应的自由和力量。”</p>
                      {pauseTimer === 0 && (
                        <button 
                          onClick={() => { setPauseTimer(60); setActiveTool(null); }}
                          className="px-8 py-3 bg-stone-900 text-white rounded-xl font-bold"
                        >
                          我感觉好多了
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTool === 'anxiety-box' && (
                <motion.div 
                  key="anxiety-box"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full max-w-xl space-y-8"
                >
                  {!isBoxClosed ? (
                    <>
                      <div className="space-y-4">
                        <h3 className="text-xl font-bold text-stone-900">写下或说出你的烦恼</h3>
                        <div className="relative">
                          <textarea 
                            value={anxietyText}
                            onChange={(e) => setAnxietyText(e.target.value)}
                            placeholder="此时此刻，什么让你感到焦虑？"
                            className="w-full h-48 p-6 bg-stone-50 border border-stone-100 rounded-3xl focus:ring-2 focus:ring-stone-200 outline-none resize-none text-stone-700"
                          />
                          <button 
                            onClick={() => {
                              if (isRecording) {
                                // Stop logic if needed, but usually recognition.stop() is handled by onend or manual
                                setIsRecording(false);
                              } else {
                                startSpeechRecognition();
                              }
                            }}
                            className={`absolute bottom-4 right-4 p-4 rounded-full shadow-lg transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-stone-400 hover:text-stone-900'}`}
                          >
                            <Mic size={20} />
                          </button>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-stone-500">设定处理时间:</span>
                          <div className="flex gap-2">
                            {['今晚', '明天', '周末', '下周'].map(t => (
                              <button 
                                key={t}
                                onClick={() => setProcessingTime(t)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${processingTime === t ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'}`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => { setIsBoxClosed(true); logToolUsage('anxiety-box', undefined, 'better'); }}
                          className="flex-1 py-4 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                        >
                          <Send size={20} /> 封存烦恼
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-6">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-32 w-32 bg-stone-100 rounded-3xl flex items-center justify-center mx-auto text-stone-400"
                      >
                        <ShieldCheck size={64} />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-stone-900">烦恼已封存</h3>
                      <p className="text-stone-500">这些烦恼已被安全存放在虚拟箱子中，并预约在 <span className="text-stone-900 font-bold">{processingTime}</span> 处理。现在，请把注意力转回到当下。</p>
                      <button 
                        onClick={() => { setIsBoxClosed(false); setAnxietyText(""); setActiveTool(null); }}
                        className="px-8 py-3 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50"
                      >
                        返回驿站
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTool === 'quadrants' && (
                <div className="w-full h-full flex flex-col gap-6">
                  <div className="flex gap-4 items-center">
                    <input 
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="添加新任务..."
                      className="flex-1 px-6 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:ring-2 focus:ring-emerald-200 outline-none"
                    />
                    <select 
                      value={selectedQuadrant}
                      onChange={(e) => setSelectedQuadrant(Number(e.target.value) as any)}
                      className="px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none"
                    >
                      <option value={1}>重要且紧急</option>
                      <option value={2}>重要不紧急</option>
                      <option value={3}>紧急不重要</option>
                      <option value={4}>不重要不紧急</option>
                    </select>
                    <button 
                      onClick={handleAddTask}
                      className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
                    >
                      <Plus size={24} />
                    </button>
                    {tasks.some(t => t.completed) && (
                      <button 
                        onClick={clearCompletedTasks}
                        className="p-3 text-stone-400 hover:text-rose-500 transition-colors"
                        title="清理已完成任务"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    {[1, 2, 3, 4].map((q) => (
                      <div key={q} className={`p-4 rounded-3xl border ${q === 1 ? 'bg-rose-50 border-rose-100' : q === 2 ? 'bg-emerald-50 border-emerald-100' : q === 3 ? 'bg-amber-50 border-amber-100' : 'bg-stone-50 border-stone-100'}`}>
                        <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${q === 1 ? 'bg-rose-500' : q === 2 ? 'bg-emerald-500' : q === 3 ? 'bg-amber-500' : 'bg-stone-500'}`} />
                          {q === 1 ? '重要且紧急' : q === 2 ? '重要不紧急' : q === 3 ? '紧急不重要' : '不重要不紧急'}
                        </h4>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                          {tasks.filter(t => t.quadrant === q).map(task => (
                            <div key={task.id} className="flex items-center gap-3 p-2 bg-white/60 rounded-lg group">
                              <button onClick={() => toggleTask(task)} className="text-stone-400 hover:text-emerald-500">
                                {task.completed ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} />}
                              </button>
                              <span className={`text-sm flex-1 ${task.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>{task.title}</span>
                              <button onClick={() => deleteDoc(doc(db, "tasks", task.id))} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-opacity">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTool === 'diary' && (
                <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-stone-900">记录此刻心情</h3>
                      <button 
                        onClick={() => setShowMoodCurve(!showMoodCurve)}
                        className="flex items-center gap-2 text-xs font-bold text-amber-600 hover:text-amber-700"
                      >
                        <TrendingUp size={16} />
                        {showMoodCurve ? "返回记录" : "查看情绪曲线"}
                      </button>
                    </div>

                    {showMoodCurve ? (
                      <div className="h-[400px] w-full bg-stone-50 rounded-3xl p-6 border border-stone-100">
                        <h4 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-6">最近 7 次心情波动</h4>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[...diaryEntries].reverse().slice(-7).map(e => ({ date: new Date(e.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }), mood: e.mood }))}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <RechartsTooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="mood" 
                              stroke="#f59e0b" 
                              strokeWidth={4} 
                              dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                              activeDot={{ r: 8, fill: '#f59e0b' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-stone-500">心情指数: {newDiary.mood}</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(m => (
                              <button 
                                key={m}
                                onClick={() => setNewDiary(prev => ({ ...prev, mood: m }))}
                                className={`h-6 w-6 rounded-md text-[10px] font-bold transition-all ${newDiary.mood === m ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="relative">
                          <textarea 
                            value={newDiary.content}
                            onChange={(e) => setNewDiary(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="写下今天让你印象深刻的事..."
                            className="w-full h-64 p-6 bg-stone-50 border border-stone-100 rounded-3xl outline-none resize-none text-stone-700"
                          />
                          <div className="absolute bottom-4 right-4 flex gap-2">
                            {newDiary.imageUrl && (
                              <div className="relative group">
                                <img src={newDiary.imageUrl} alt="Upload" className="h-12 w-12 rounded-lg object-cover border border-white shadow-sm" />
                                <button 
                                  onClick={() => setNewDiary(prev => ({ ...prev, imageUrl: "" }))}
                                  className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            )}
                            <button 
                              onClick={() => setNewDiary(prev => ({ ...prev, imageUrl: "https://picsum.photos/seed/diary/800/600" }))}
                              className="p-3 bg-white text-stone-400 hover:text-amber-500 rounded-2xl shadow-sm border border-stone-100 transition-all"
                            >
                              <ImageIcon size={20} />
                            </button>
                          </div>
                        </div>
                        <button 
                          onClick={handleSaveDiary}
                          className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                        >
                          <Save size={20} /> 保存日记
                        </button>
                      </div>
                    )}
                  </div>
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-stone-900">往期回顾</h3>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4">
                        {diaryEntries.map(entry => (
                          <div key={entry.id} className="p-6 bg-stone-50 rounded-3xl border border-stone-100 space-y-3 relative group">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-stone-400">{new Date(entry.timestamp).toLocaleDateString()}</span>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg">心情 {entry.mood}</span>
                                <button 
                                  onClick={() => entry.id && handleDeleteDiary(entry.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-rose-500 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-stone-700 leading-relaxed line-clamp-3">{entry.content}</p>
                            {entry.imageUrl && (
                              <img src={entry.imageUrl} alt="Diary" className="w-full h-32 object-cover rounded-2xl mt-2" referrerPolicy="no-referrer" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                </div>
              )}

              {activeTool === 'mindfulness' && (
                <div className="w-full max-w-2xl space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-stone-900">正念冥想库</h3>
                      <p className="text-xs text-stone-400 mt-1">精选 Pixabay 高品质正念音源</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto pr-2">
                    {mindfulnessTracks.map(track => (
                      <button 
                        key={track.id}
                        onClick={() => { 
                          if (selectedAudio?.id === track.id) {
                            setIsPlaying(!isPlaying);
                          } else {
                            setSelectedAudio(track); 
                            setIsPlaying(true);
                            logToolUsage('mindfulness', 300, 'better'); 
                          }
                        }}
                        className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${selectedAudio?.id === track.id ? 'bg-violet-50 border-violet-200 ring-1 ring-violet-200' : 'bg-white border-stone-100 hover:bg-stone-50'}`}
                      >
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${selectedAudio?.id === track.id ? 'bg-violet-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
                          {selectedAudio?.id === track.id && isPlaying ? <Activity size={20} /> : <Music size={20} />}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <h4 className="font-bold text-stone-900 text-sm truncate">{track.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded font-bold">{track.category}</span>
                            <span className="text-[10px] text-stone-400">{track.duration}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {selectedAudio && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-stone-900 rounded-[32px] text-white flex items-center gap-5 shadow-2xl"
                    >
                      <audio 
                        ref={audioRef} 
                        onEnded={() => setIsPlaying(false)}
                        onError={(e) => {
                          console.error("音频加载失败");
                          setIsPlaying(false);
                        }}
                      />
                      <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                        <Music size={24} className="text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-white/40 uppercase mb-0.5">{isPlaying ? "正在播放" : "已暂停"}</p>
                        <p className="font-bold text-sm truncate">{selectedAudio.title}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="h-12 w-12 rounded-full bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/20 hover:scale-105 transition-transform"
                        >
                          {isPlaying ? <Pause size={24} /> : <Music size={24} />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {activeTool === 'cards' && (
                <div className="w-full max-w-md space-y-8">
                  <motion.div 
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    className="aspect-[3/4] bg-white rounded-[40px] border border-stone-100 shadow-2xl p-10 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
                    <Heart className="text-rose-500" size={48} fill="currentColor" />
                    <div className="space-y-4">
                      <p className="text-2xl font-serif italic text-stone-800 leading-relaxed">{dailyCard.quote}</p>
                      <p className="text-sm font-bold text-stone-400">— {dailyCard.author}</p>
                    </div>
                    <div className="w-full h-px bg-stone-100" />
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">今日练习</p>
                      <p className="text-sm text-stone-600 leading-relaxed">{dailyCard.practice}</p>
                    </div>
                  </motion.div>
                  <button 
                    onClick={() => { logToolUsage('cards', undefined, 'better'); setActiveTool(null); }}
                    className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-100"
                  >
                    完成今日练习
                  </button>
                </div>
              )}

              {activeTool === 'boundaries' && (
                <div className="w-full max-w-2xl space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-stone-900">沟通边界模拟</h3>
                    <p className="text-stone-500">练习在不同情景下设定健康的职场边界</p>
                  </div>
                  
                  <div className="p-8 bg-stone-50 rounded-[32px] border border-stone-100 space-y-6">
                    <div className="flex items-center gap-3 text-teal-600 font-bold">
                      <ShieldCheck size={24} />
                      <span>情景 {currentScenario + 1} / {boundaryScenarios.length}</span>
                    </div>
                    <p className="text-lg font-medium text-stone-800 leading-relaxed">
                      {boundaryScenarios[currentScenario].context}
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {boundaryScenarios[currentScenario].options.map((opt, i) => (
                        <button 
                          key={i}
                          onClick={() => {
                            setSelectedOption(i);
                            setBoundaryFeedback(opt.feedback);
                          }}
                          className={`p-4 border rounded-2xl text-left text-sm font-medium transition-all ${selectedOption === i ? 'bg-teal-600 text-white border-teal-600 shadow-lg' : 'bg-white border-stone-200 hover:border-teal-500 hover:bg-teal-50 text-stone-700'}`}
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {boundaryFeedback && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 bg-teal-900 text-white rounded-3xl space-y-4"
                      >
                        <div className="flex items-center gap-2 font-bold">
                          <Info size={18} />
                          <span>专家建议</span>
                        </div>
                        <p className="text-sm leading-relaxed text-teal-100">{boundaryFeedback}</p>
                        <button 
                          onClick={() => {
                            if (currentScenario < boundaryScenarios.length - 1) {
                              setCurrentScenario(prev => prev + 1);
                              setBoundaryFeedback(null);
                              setSelectedOption(null);
                            } else {
                              logToolUsage('boundaries', undefined, 'better');
                              setActiveTool(null);
                            }
                          }}
                          className="w-full py-3 bg-white text-teal-900 rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                          {currentScenario < boundaryScenarios.length - 1 ? "下一题" : "完成练习"} <ArrowRight size={18} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Community Sidebar */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">话题小组</h3>
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setActiveTopic(topic.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTopic === topic.id ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-stone-500 hover:bg-stone-50'}`}
                >
                  <topic.icon size={18} />
                  {topic.name}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowNewPost(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
            >
              <Plus size={20} /> 发布心声
            </button>
          </div>

          {/* Community Feed */}
          <div className="lg:col-span-3 space-y-6">
            {posts.filter(p => activeTopic === 'all' || p.topic === activeTopic).map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${post.isModerator ? 'bg-blue-100 text-blue-600' : 'bg-stone-100 text-stone-400'}`}>
                      {post.isModerator ? <ShieldCheck size={20} /> : <Users size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-stone-900">{post.isModerator ? "社区专家" : "匿名教师"}</p>
                        {post.isModerator && <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-bold rounded uppercase">Moderator</span>}
                      </div>
                      <p className="text-[10px] text-stone-400 font-medium">{new Date(post.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-stone-50 text-stone-500 text-[10px] font-bold rounded-full uppercase">
                      {TOPICS.find(t => t.id === post.topic)?.name}
                    </span>
                    {post.authorId === profile?.uid && (
                      <button 
                        onClick={() => post.id && handleDeletePost(post.id)}
                        className="p-1.5 text-stone-300 hover:text-rose-500 transition-colors"
                        title="删除我的发布"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                <div className="flex items-center gap-6 pt-4 border-t border-stone-50">
                  <button 
                    onClick={() => handleLike(post)}
                    className={`flex items-center gap-2 text-sm font-bold transition-colors ${post.likedBy?.includes(profile?.uid || '') ? 'text-blue-600' : 'text-stone-400 hover:text-blue-600'}`}
                  >
                    <Heart size={18} fill={post.likedBy?.includes(profile?.uid || '') ? "currentColor" : "none"} />
                    {post.likes}
                  </button>
                  <button 
                    onClick={() => setReplyingTo(post)}
                    className="flex items-center gap-2 text-sm font-bold text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <MessageSquare size={18} />
                    回复 {comments[post.id || '']?.length || 0}
                  </button>
                </div>

                {comments[post.id || ''] && (
                  <div className="mt-4 space-y-4 pl-8 border-l-2 border-stone-50">
                    {comments[post.id || ''].map((comment) => (
                      <div key={comment.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold ${comment.isModerator ? 'text-blue-600' : 'text-stone-500'}`}>
                            {comment.isModerator ? "专家回复" : "匿名回复"}
                          </span>
                          <span className="text-[8px] text-stone-300">{new Date(comment.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-stone-600">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showNewPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewPost(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-stone-900">发布心声</h2>
                <button onClick={() => setShowNewPost(false)} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><X size={24} className="text-stone-400" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex flex-wrap gap-2">
                  {TOPICS.filter(t => t.id !== 'all').map(topic => (
                    <button key={topic.id} onClick={() => setSelectedTopic(topic.id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedTopic === topic.id ? 'bg-blue-600 text-white' : 'bg-stone-50 text-stone-500'}`}>{topic.name}</button>
                  ))}
                </div>
                <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder="分享您的心声..." className="w-full h-48 p-6 bg-stone-50 border border-stone-100 rounded-3xl outline-none resize-none text-stone-700" />
                {moderationError && <p className="text-xs text-rose-600">{moderationError}</p>}
              </div>
              <div className="p-8 bg-stone-50 flex justify-end gap-4">
                <button onClick={() => setShowNewPost(false)} className="px-6 py-2 text-stone-500 font-bold">取消</button>
                <button onClick={handleSubmitPost} disabled={isSubmitting || !newPostContent.trim()} className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100">确认发布</button>
              </div>
            </motion.div>
          </div>
        )}

        {replyingTo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReplyingTo(null)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-stone-900">回复心声</h2>
                <button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><X size={24} className="text-stone-400" /></button>
              </div>
              <div className="p-8 space-y-4">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 text-sm text-stone-600 italic">"{replyingTo.content}"</div>
                <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="写下您的回复..." className="w-full h-32 p-4 bg-stone-50 border border-stone-100 rounded-2xl outline-none resize-none text-stone-700" />
              </div>
              <div className="p-8 bg-stone-50 flex justify-end gap-4">
                <button onClick={() => setReplyingTo(null)} className="px-6 py-2 text-stone-500 font-bold">取消</button>
                <button onClick={handleSubmitReply} disabled={isSubmitting || !replyContent.trim()} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100">确认回复</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">累计调适时长</p>
            <p className="text-2xl font-black text-stone-900">128 <span className="text-sm font-normal text-stone-400">分钟</span></p>
          </div>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">心情记录天数</p>
            <p className="text-2xl font-black text-stone-900">{diaryEntries.length} <span className="text-sm font-normal text-stone-400">天</span></p>
          </div>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">任务完成率</p>
            <p className="text-2xl font-black text-stone-900">
              {tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}
              <span className="text-sm font-normal text-stone-400">%</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolkit;
