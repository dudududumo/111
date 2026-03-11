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
  Info
} from "lucide-react";
import { UserProfile, ToolUsage, DiaryEntry, Task } from "../types";
import { db } from "../firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";

interface ToolkitProps {
  profile: UserProfile | null;
}

const Toolkit: React.FC<ToolkitProps> = ({ profile }) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
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
  const [processingTime, setProcessingTime] = useState("tonight");

  // Mindfulness State
  const [selectedAudio, setSelectedAudio] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (selectedAudio && isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name !== 'AbortError') {
            console.error("Audio play failed:", err.message);
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
    { id: 'm1', title: '5分钟晨间唤醒：森林晨曦', duration: '5:00', category: '能量', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
    { id: 'm2', title: '10分钟深度放松：海浪冥想', duration: '10:00', category: '减压', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
    { id: 'm3', title: '3分钟呼吸锚点：雨夜宁静', duration: '3:00', category: '专注', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3' },
    { id: 'm4', title: '15分钟慈悲冥想：星空入眠', duration: '15:00', category: '情绪', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' },
    { id: 'm5', title: '阿尔法波：深度专注', duration: '20:00', category: '学习', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' },
    { id: 'm6', title: '自然之声：夏日蝉鸣', duration: '10:00', category: '放松', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3' },
  ];

  const musicLibraries = [
    { name: "Pixabay Music", url: "https://pixabay.com/music/", desc: "高品质免版税音乐库" },
    { name: "Bensound", url: "https://www.bensound.com", desc: "专业的背景音乐资源" },
    { name: "Free Music Archive", url: "https://freemusicarchive.org", desc: "独立音乐人的共享社区" },
  ];

  const [customUrl, setCustomUrl] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

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
  const [newDiary, setNewDiary] = useState({ content: "", mood: 5, tags: [] as string[] });

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

    return () => {
      unsubscribeDiary();
      unsubscribeTasks();
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

  const handleSaveDiary = async () => {
    if (!newDiary.content.trim() || !profile) return;
    await addDoc(collection(db, "diaries"), {
      uid: profile.uid,
      content: newDiary.content,
      mood: newDiary.mood,
      tags: newDiary.tags,
      timestamp: new Date().toISOString()
    });
    setNewDiary({ content: "", mood: 5, tags: [] });
    logToolUsage('diary', undefined, 'better');
  };

  const handleDeleteDiary = async (id: string) => {
    if (!window.confirm("确定要删除这条日记吗？")) return;
    try {
      await deleteDoc(doc(db, "diaries", id));
    } catch (err) {
      console.error("Failed to delete diary:", err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
            <Wind className="text-blue-500" size={32} />
            心晴调适驿站
          </h1>
          <p className="text-stone-500 mt-1">数字化心理工具包，助您在繁忙工作中找回宁静</p>
        </div>
      </div>

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
                        <h3 className="text-xl font-bold text-stone-900">写下你的烦恼</h3>
                        <textarea 
                          value={anxietyText}
                          onChange={(e) => setAnxietyText(e.target.value)}
                          placeholder="此时此刻，什么让你感到焦虑？"
                          className="w-full h-48 p-6 bg-stone-50 border border-stone-100 rounded-3xl focus:ring-2 focus:ring-stone-200 outline-none resize-none text-stone-700"
                        />
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
                    <h3 className="text-xl font-bold text-stone-900">记录此刻心情</h3>
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
                      <textarea 
                        value={newDiary.content}
                        onChange={(e) => setNewDiary(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="写下今天让你印象深刻的事..."
                        className="w-full h-64 p-6 bg-stone-50 border border-stone-100 rounded-3xl outline-none resize-none text-stone-700"
                      />
                      <button 
                        onClick={handleSaveDiary}
                        className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Save size={20} /> 保存日记
                      </button>
                    </div>
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
                      <p className="text-xs text-stone-400 mt-1">当前音源来自 SoundHelix 免版税曲库</p>
                    </div>
                    <button 
                      onClick={() => setShowCustomInput(!showCustomInput)}
                      className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-200 transition-all"
                    >
                      {showCustomInput ? "返回列表" : "添加自定义音源"}
                    </button>
                  </div>

                  {showCustomInput ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100 space-y-4">
                        <h4 className="font-bold text-stone-800 flex items-center gap-2">
                          <Plus size={18} /> 输入音频 URL
                        </h4>
                        <input 
                          type="text"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          placeholder="https://example.com/music.mp3"
                          className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200"
                        />
                        <button 
                          onClick={() => {
                            if (customUrl) {
                              const newTrack = { id: 'custom-' + Date.now(), title: '自定义音源', duration: '未知', category: '自定义', url: customUrl };
                              setSelectedAudio(newTrack);
                              setIsPlaying(true);
                              setShowCustomInput(false);
                              setCustomUrl("");
                            }
                          }}
                          className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-100"
                        >
                          立即播放
                        </button>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-stone-400 uppercase tracking-widest">推荐免版税音乐库</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {musicLibraries.map(lib => (
                            <a 
                              key={lib.name}
                              href={lib.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-4 bg-white border border-stone-100 rounded-2xl hover:shadow-md transition-all group"
                            >
                              <p className="font-bold text-stone-900 group-hover:text-violet-600">{lib.name}</p>
                              <p className="text-[10px] text-stone-400 mt-1">{lib.desc}</p>
                            </a>
                          ))}
                        </div>
                        <p className="text-[10px] text-stone-400 italic">提示：在这些网站找到喜欢的音乐后，复制其 MP3 直链即可在此播放。</p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2">
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
                          className={`p-6 rounded-3xl border transition-all flex items-center gap-6 ${selectedAudio?.id === track.id ? 'bg-violet-50 border-violet-200 ring-1 ring-violet-200' : 'bg-white border-stone-100 hover:bg-stone-50'}`}
                        >
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${selectedAudio?.id === track.id ? 'bg-violet-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
                            {selectedAudio?.id === track.id && isPlaying ? <Activity size={24} /> : <Music size={24} />}
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="font-bold text-stone-900">{track.title}</h4>
                            <p className="text-xs text-stone-500 mt-1">{track.category} · {track.duration}</p>
                          </div>
                          <ChevronRight size={20} className="text-stone-300" />
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedAudio && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-stone-900 rounded-3xl text-white flex items-center gap-6"
                    >
                      <audio 
                        ref={audioRef} 
                        src={selectedAudio.url} 
                        onEnded={() => setIsPlaying(false)}
                        onError={(e) => {
                          console.error("Audio source failed to load");
                          setIsPlaying(false);
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white/60 uppercase mb-1">{isPlaying ? "正在播放" : "已暂停"}</p>
                        <p className="font-bold">{selectedAudio.title}</p>
                      </div>
                      <div className="flex gap-4">
                        <button className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                          <Volume2 size={20} />
                        </button>
                        <button 
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="h-10 w-10 rounded-full bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/20"
                        >
                          {isPlaying ? <Pause size={20} /> : <Music size={20} />}
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
