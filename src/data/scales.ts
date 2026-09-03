export interface Question {
  id: number;
  text: string;
  options: { label: string; value: number }[];
}

export interface Scale {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  calculateResult: (scores: number[]) => { score: number; level: string; color: string; advice: string };
}

const SCL90_OPTIONS = [
  { label: "没有", value: 1 },
  { label: "很轻", value: 2 },
  { label: "中等", value: 3 },
  { label: "偏重", value: 4 },
  { label: "严重", value: 5 },
];

// SCL-90 (Symptom Checklist-90) - Full 90 items
export const SCL90_SCALE: Scale = {
  id: "scl90",
  name: "SCL-90 症状自评量表",
  description: "全面评估受测者近期（一周内）的心理症状严重程度，涵盖9大核心症状维度。",
  questions: [
    { id: 1, text: "头痛", options: SCL90_OPTIONS },
    { id: 2, text: "神经过敏，心中不踏实", options: SCL90_OPTIONS },
    { id: 3, text: "头脑中有不必要的想法或字句盘旋", options: SCL90_OPTIONS },
    { id: 4, text: "头晕或晕倒", options: SCL90_OPTIONS },
    { id: 5, text: "对异性的兴趣减退", options: SCL90_OPTIONS },
    { id: 6, text: "对旁人责备求全", options: SCL90_OPTIONS },
    { id: 7, text: "感到别人能控制你的思想", options: SCL90_OPTIONS },
    { id: 8, text: "责怪别人制造麻烦", options: SCL90_OPTIONS },
    { id: 9, text: "忘性大", options: SCL90_OPTIONS },
    { id: 10, text: "担心自己的衣饰整齐及仪态的端正", options: SCL90_OPTIONS },
    { id: 11, text: "容易烦恼和激动", options: SCL90_OPTIONS },
    { id: 12, text: "胸痛", options: SCL90_OPTIONS },
    { id: 13, text: "害怕空旷的场所或街道", options: SCL90_OPTIONS },
    { id: 14, text: "感到自己的精力下降，活动减慢", options: SCL90_OPTIONS },
    { id: 15, text: "想结束自己的生命", options: SCL90_OPTIONS },
    { id: 16, text: "听到旁人听不到的声音", options: SCL90_OPTIONS },
    { id: 17, text: "发抖", options: SCL90_OPTIONS },
    { id: 18, text: "感到大多数人都不可信任", options: SCL90_OPTIONS },
    { id: 19, text: "胃口不好", options: SCL90_OPTIONS },
    { id: 20, text: "容易哭泣", options: SCL90_OPTIONS },
    { id: 21, text: "同异性相处时感害羞不自在", options: SCL90_OPTIONS },
    { id: 22, text: "感到受骗、中了圈套或有人想抓住你", options: SCL90_OPTIONS },
    { id: 23, text: "无缘无故地突然感到害怕", options: SCL90_OPTIONS },
    { id: 24, text: "自己不能控制地大发脾气", options: SCL90_OPTIONS },
    { id: 25, text: "怕单独出门", options: SCL90_OPTIONS },
    { id: 26, text: "经常责怪自己", options: SCL90_OPTIONS },
    { id: 27, text: "腰痛", options: SCL90_OPTIONS },
    { id: 28, text: "感到难以完成任务", options: SCL90_OPTIONS },
    { id: 29, text: "感到孤独", options: SCL90_OPTIONS },
    { id: 30, text: "感到苦闷", options: SCL90_OPTIONS },
    { id: 31, text: "过分担忧", options: SCL90_OPTIONS },
    { id: 32, text: "对事物不感兴趣", options: SCL90_OPTIONS },
    { id: 33, text: "感到害怕", options: SCL90_OPTIONS },
    { id: 34, text: "感情容易受到伤害", options: SCL90_OPTIONS },
    { id: 35, text: "旁人能知道你的想法", options: SCL90_OPTIONS },
    { id: 36, text: "感到别人不理解你、不同情你", options: SCL90_OPTIONS },
    { id: 37, text: "感到人们对你不友好、不喜欢你", options: SCL90_OPTIONS },
    { id: 38, text: "做事必须反复检查", options: SCL90_OPTIONS },
    { id: 39, text: "难以作出决定", options: SCL90_OPTIONS },
    { id: 40, text: "心跳得很厉害", options: SCL90_OPTIONS },
    { id: 41, text: "恶心或胃部不舒服", options: SCL90_OPTIONS },
    { id: 42, text: "感到比不上他人", options: SCL90_OPTIONS },
    { id: 43, text: "肌肉酸痛", options: SCL90_OPTIONS },
    { id: 44, text: "感到有人在监视你、谈论你", options: SCL90_OPTIONS },
    { id: 45, text: "难以入睡", options: SCL90_OPTIONS },
    { id: 46, text: "做事必须反复检查", options: SCL90_OPTIONS },
    { id: 47, text: "怕乘电车、公共汽车、地铁或火车", options: SCL90_OPTIONS },
    { id: 48, text: "呼吸有困难", options: SCL90_OPTIONS },
    { id: 49, text: "一阵阵发冷或发热", options: SCL90_OPTIONS },
    { id: 50, text: "因为感到害怕而避开某些东西、场合或活动", options: SCL90_OPTIONS },
    { id: 51, text: "脑子变空了", options: SCL90_OPTIONS },
    { id: 52, text: "身体发麻或刺痛", options: SCL90_OPTIONS },
    { id: 53, text: "喉咙有梗塞感", options: SCL90_OPTIONS },
    { id: 54, text: "感到对前途没有希望", options: SCL90_OPTIONS },
    { id: 55, text: "不能集中注意力", options: SCL90_OPTIONS },
    { id: 56, text: "感到身体的某一部分软弱无力", options: SCL90_OPTIONS },
    { id: 57, text: "感到紧张或容易紧张", options: SCL90_OPTIONS },
    { id: 58, text: "感到手或脚发重", options: SCL90_OPTIONS },
    { id: 59, text: "想到死亡的事", options: SCL90_OPTIONS },
    { id: 60, text: "吃得太多", options: SCL90_OPTIONS },
    { id: 61, text: "当别人看着你或谈论你时感到不自在", options: SCL90_OPTIONS },
    { id: 62, text: "有一些不属于你自己的想法", options: SCL90_OPTIONS },
    { id: 63, text: "有想打人或伤害他人的冲动", options: SCL90_OPTIONS },
    { id: 64, text: "醒得太早", options: SCL90_OPTIONS },
    { id: 65, text: "必须反复洗手、点数目或触摸某些东西", options: SCL90_OPTIONS },
    { id: 66, text: "睡得不稳不深", options: SCL90_OPTIONS },
    { id: 67, text: "有想摔坏或破坏东西的冲动", options: SCL90_OPTIONS },
    { id: 68, text: "有一些别人没有的想法或念头", options: SCL90_OPTIONS },
    { id: 69, text: "感到对别人神经过敏", options: SCL90_OPTIONS },
    { id: 70, text: "在商店或电影院等人多的地方感到不自在", options: SCL90_OPTIONS },
    { id: 71, text: "感到任何事情都很困难", options: SCL90_OPTIONS },
    { id: 72, text: "一阵阵恐惧或惊恐", options: SCL90_OPTIONS },
    { id: 73, text: "感到在公共场合吃东西很不舒服", options: SCL90_OPTIONS },
    { id: 74, text: "经常与人争论", options: SCL90_OPTIONS },
    { id: 75, text: "单独一人时神经很紧张", options: SCL90_OPTIONS },
    { id: 76, text: "别人对你的成绩没有作出恰当的评价", options: SCL90_OPTIONS },
    { id: 77, text: "即使和别人在一起也感到孤单", options: SCL90_OPTIONS },
    { id: 78, text: "感到坐立不安、心神不定", options: SCL90_OPTIONS },
    { id: 79, text: "感到自己没有什么价值", options: SCL90_OPTIONS },
    { id: 80, text: "感到熟悉的东西变成陌生或不像是真的", options: SCL90_OPTIONS },
    { id: 81, text: "大叫或摔东西", options: SCL90_OPTIONS },
    { id: 82, text: "害怕会在公共场合昏倒", options: SCL90_OPTIONS },
    { id: 83, text: "感到别人想占你的便宜", options: SCL90_OPTIONS },
    { id: 84, text: "为一些有关“性”的想法而很苦恼", options: SCL90_OPTIONS },
    { id: 85, text: "认为应该因为自己的过错而受到惩罚", options: SCL90_OPTIONS },
    { id: 86, text: "感到要赶快把事情做完", options: SCL90_OPTIONS },
    { id: 87, text: "感到自己的身体有严重问题", options: SCL90_OPTIONS },
    { id: 88, text: "从未感到和其他人很亲近", options: SCL90_OPTIONS },
    { id: 89, text: "感到自己有罪", options: SCL90_OPTIONS },
    { id: 90, text: "感到自己的脑子有毛病", options: SCL90_OPTIONS },
  ],
  calculateResult: (scores) => {
    // 不进行反向计分处理，根据用户提供的评分标准，1=没有，2=很轻，3=中等，4=偏重，5=严重
    const total = scores.reduce((a, b) => a + b, 0);
    const avg = total / 90;
    const positiveItems = scores.filter(score => score >= 2).length;
    
    // Factor indices (1-based from PDF)
    const somatization = [1, 4, 12, 27, 40, 42, 48, 49, 52, 53, 56, 58];
    const obsessive = [3, 9, 10, 28, 38, 45, 46, 51, 55, 65];
    const interpersonal = [6, 21, 34, 36, 37, 41, 61, 69, 73];
    const depression = [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79];
    const anxiety = [2, 17, 23, 33, 39, 57, 72, 78, 80, 86];
    const hostility = [11, 24, 63, 67, 74, 81];
    const phobia = [13, 25, 47, 50, 70, 75, 82];
    const paranoia = [8, 18, 43, 68, 76, 83];
    const psychoticism = [7, 16, 35, 62, 77, 84, 85, 87, 88, 90];

    const getFactorAvg = (indices: number[]) => {
      const sum = indices.reduce((acc, idx) => acc + (scores[idx - 1] || 0), 0);
      return sum / indices.length;
    };

    const factorScores = {
      somatization: getFactorAvg(somatization),
      obsessive: getFactorAvg(obsessive),
      interpersonal: getFactorAvg(interpersonal),
      depression: getFactorAvg(depression),
      anxiety: getFactorAvg(anxiety),
      hostility: getFactorAvg(hostility),
      phobia: getFactorAvg(phobia),
      paranoia: getFactorAvg(paranoia),
      psychoticism: getFactorAvg(psychoticism),
    };

    const maxFactorScore = Math.max(...Object.values(factorScores));

    // 根据中国常模标准判断结果
    if (total < 160 && avg < 1.5 && maxFactorScore < 2) {
      return { score: total, level: "正常", color: "green", advice: "您的整体心理健康状况良好，继续保持积极的生活态度。" };
    } else if (total >= 160 || avg >= 1.5 || maxFactorScore >= 2) {
      if (maxFactorScore >= 4 || total >= 250) {
        return { score: total, level: "重度症状", color: "red", advice: "您的心理症状非常严重，建议立即寻求精神科医生的专业评估与干预。" };
      } else if (maxFactorScore >= 3 || total >= 200) {
        return { score: total, level: "中度症状", color: "orange", advice: "您存在明显的心理症状，建议寻求心理咨询师的专业帮助，进行深入评估。" };
      } else {
        return { score: total, level: "轻度症状", color: "yellow", advice: "您可能存在一些轻微的心理困扰，建议关注相关因子（如抑郁或焦虑），尝试放松练习。" };
      }
    } else {
      return { score: total, level: "正常", color: "green", advice: "您的整体心理健康状况良好，继续保持积极的生活态度。" };
    }
  }
};

const SAS_OPTIONS = [
  { label: "没有或很少时间", value: 1 },
  { label: "少部分时间", value: 2 },
  { label: "相当多时间", value: 3 },
  { label: "绝大部分或全部时间", value: 4 },
];

// SAS (Self-Rating Anxiety Scale) - Full 20 items
export const SAS_SCALE: Scale = {
  id: "sas",
  name: "SAS 焦虑自评量表",
  description: "快速、准确评估受测者近期（一周内）的焦虑情绪严重程度。",
  questions: [
    { id: 1, text: "我觉得比平常容易紧张和着急", options: SAS_OPTIONS },
    { id: 2, text: "我无缘无故地感到害怕", options: SAS_OPTIONS },
    { id: 3, text: "我容易心里烦乱或感到惊恐", options: SAS_OPTIONS },
    { id: 4, text: "我觉得我可能将要发疯", options: SAS_OPTIONS },
    { id: 5, text: "我觉得一切都很好，也不会发生什么不幸", options: SAS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 6, text: "我手脚发抖打颤", options: SAS_OPTIONS },
    { id: 7, text: "我由于头痛、颈痛和背痛而苦恼", options: SAS_OPTIONS },
    { id: 8, text: "我感觉容易衰弱和疲乏", options: SAS_OPTIONS },
    { id: 9, text: "我觉得心平气和，并且容易安静坐着", options: SAS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 10, text: "我觉得心跳很快", options: SAS_OPTIONS },
    { id: 11, text: "我由于一阵阵头晕而苦恼", options: SAS_OPTIONS },
    { id: 12, text: "我有晕倒发作，或觉得要晕倒似的", options: SAS_OPTIONS },
    { id: 13, text: "我呼气吸气都感到很容易", options: SAS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 14, text: "我手脚麻木和刺痛", options: SAS_OPTIONS },
    { id: 15, text: "我由于胃痛和消化不良而苦恼", options: SAS_OPTIONS },
    { id: 16, text: "我常常要小便", options: SAS_OPTIONS },
    { id: 17, text: "我的手常是干燥温暖的", options: SAS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 18, text: "我脸红发热", options: SAS_OPTIONS },
    { id: 19, text: "我容易入睡，并且睡得很好", options: SAS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 20, text: "我做噩梦", options: SAS_OPTIONS },
  ],
  calculateResult: (scores) => {
    const rawScore = scores.reduce((a, b) => a + b, 0);
    const standardScore = Math.floor(rawScore * 1.25);
    if (standardScore < 50) return { score: standardScore, level: "正常", color: "green", advice: "无明显焦虑症状，心理状态良好。" };
    if (standardScore < 60) return { score: standardScore, level: "轻度焦虑", color: "yellow", advice: "存在轻微焦虑情绪，可通过放松训练、情绪疏导缓解。" };
    if (standardScore < 70) return { score: standardScore, level: "中度焦虑", color: "orange", advice: "焦虑症状较明显，建议寻求专业心理咨询帮助。" };
    return { score: standardScore, level: "重度焦虑", color: "red", advice: "焦虑症状严重，需及时就医，由精神科医生进行专业评估与干预。" };
  }
};

const SDS_OPTIONS = [
  { label: "没有或很少时间", value: 1 },
  { label: "少部分时间", value: 2 },
  { label: "相当多时间", value: 3 },
  { label: "绝大部分或全部时间", value: 4 },
];

// SDS (Self-Rating Depression Scale) - Full 20 items
export const SDS_SCALE: Scale = {
  id: "sds",
  name: "SDS 抑郁自评量表",
  description: "快速评估受测者近期（一周内）的抑郁情绪严重程度。",
  questions: [
    { id: 1, text: "我觉得闷闷不乐，情绪低沉", options: SDS_OPTIONS },
    { id: 2, text: "我觉得一天之中早晨最好", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 3, text: "我一阵阵哭出来或觉得想哭", options: SDS_OPTIONS },
    { id: 4, text: "我晚上睡眠不好", options: SDS_OPTIONS },
    { id: 5, text: "我吃得跟平时一样多", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 6, text: "我愿意和异性亲近", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 7, text: "我发觉我的体重在下降", options: SDS_OPTIONS },
    { id: 8, text: "我有便秘的苦恼", options: SDS_OPTIONS },
    { id: 9, text: "我心跳比平时快", options: SDS_OPTIONS },
    { id: 10, text: "我无缘无故地感到疲乏", options: SDS_OPTIONS },
    { id: 11, text: "我的头脑跟平时一样清楚", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 12, text: "我做事情跟平时一样容易", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 13, text: "我觉得不安而平静不下来", options: SDS_OPTIONS },
    { id: 14, text: "我对未来抱有希望", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 15, text: "我比平时容易激怒", options: SDS_OPTIONS },
    { id: 16, text: "我觉得作出决定是容易的", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 17, text: "我觉得自己是个有用的人，有人需要我", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 18, text: "我的生活过得很有意思", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 19, text: "我觉得如果我死了，别人会生活得更好", options: SDS_OPTIONS },
    { id: 20, text: "我仍然喜爱平时喜爱的东西", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
  ],
  calculateResult: (scores) => {
    const rawScore = scores.reduce((a, b) => a + b, 0);
    const standardScore = Math.floor(rawScore * 1.25);
    if (standardScore < 53) return { score: standardScore, level: "正常", color: "green", advice: "无明显抑郁症状，心理状态良好。" };
    if (standardScore < 63) return { score: standardScore, level: "轻度抑郁", color: "yellow", advice: "存在轻微抑郁情绪，可通过运动、规律作息、倾诉等方式改善。" };
    if (standardScore < 73) return { score: standardScore, level: "中度抑郁", color: "orange", advice: "抑郁症状较明显，建议及时寻求专业心理咨询或精神科门诊评估。" };
    return { score: standardScore, level: "重度抑郁", color: "red", advice: "抑郁症状严重，可能出现自杀念头，需立即就医，寻求紧急干预。" };
  }
};

const MBI_OPTIONS = [
  { label: "从未有过", value: 1 },
  { label: "很少有", value: 2 },
  { label: "偶尔有", value: 3 },
  { label: "经常有", value: 4 },
  { label: "总是有", value: 5 },
];

// MBI (Maslach Burnout Inventory) - Educator Survey Full 22 items
export const MBI_SCALE: Scale = {
  id: "mbi",
  name: "MBI 教师职业倦怠量表",
  description: "精准评估教师近一个月内的职业倦怠程度，涵盖情绪耗竭、去人格化和个人成就感。",
  questions: [
    { id: 1, text: "我感到自己的情绪被工作耗尽了", options: MBI_OPTIONS },
    { id: 2, text: "工作让我感到身心俱疲", options: MBI_OPTIONS },
    { id: 3, text: "我觉得自己的精力在工作中被过度消耗", options: MBI_OPTIONS },
    { id: 4, text: "面对学生时，我难以提起热情和耐心", options: MBI_OPTIONS },
    { id: 5, text: "我对工作中的新挑战感到力不从心", options: MBI_OPTIONS },
    { id: 6, text: "我觉得自己在工作中没有成就感", options: MBI_OPTIONS },
    { id: 7, text: "我对学生的问题不再关心，变得冷漠", options: MBI_OPTIONS },
    { id: 8, text: "我觉得自己的工作没有价值和意义", options: MBI_OPTIONS },
    { id: 9, text: "工作一天后，我感到极度疲惫，不想做任何事", options: MBI_OPTIONS },
    { id: 10, text: "我对教育教学工作的兴趣越来越淡", options: MBI_OPTIONS },
    { id: 11, text: "我能有效地处理学生的各种问题", options: MBI_OPTIONS.map((o, i) => ({ ...o, value: 5 - i })) }, // Reverse
    { id: 12, text: "我为自己的教学成果感到自豪", options: MBI_OPTIONS.map((o, i) => ({ ...o, value: 5 - i })) }, // Reverse
    { id: 13, text: "我能很好地应对工作中的压力和困难", options: MBI_OPTIONS.map((o, i) => ({ ...o, value: 5 - i })) }, // Reverse
    { id: 14, text: "我觉得自己是一名合格且优秀的教师", options: MBI_OPTIONS.map((o, i) => ({ ...o, value: 5 - i })) }, // Reverse
    { id: 15, text: "我能从教学工作中获得心理满足", options: MBI_OPTIONS.map((o, i) => ({ ...o, value: 5 - i })) }, // Reverse
    { id: 16, text: "我愿意主动学习新的教学方法和理念", options: MBI_OPTIONS.map((o, i) => ({ ...o, value: 5 - i })) }, // Reverse
    { id: 17, text: "我对学生的成长和进步抱有期待", options: MBI_OPTIONS.map((o, i) => ({ ...o, value: 5 - i })) }, // Reverse
    { id: 18, text: "我觉得自己的工作能给学生带来积极影响", options: MBI_OPTIONS.map((o, i) => ({ ...o, value: 5 - i })) }, // Reverse
    { id: 19, text: "我在工作中容易烦躁、易怒", options: MBI_OPTIONS },
    { id: 20, text: "我常常想暂时离开教学岗位，休息一段时间", options: MBI_OPTIONS },
    { id: 21, text: "我觉得自己的工作负担过重，难以承受", options: MBI_OPTIONS },
    { id: 22, text: "我对同事的工作状态和困难漠不关心", options: MBI_OPTIONS },
  ],
  calculateResult: (scores) => {
    const total = scores.reduce((a, b) => a + b, 0);
    if (total <= 44) return { score: total, level: "正常", color: "green", advice: "您对工作充满热情，职业成就感较高，请继续保持良好的工作心态。" };
    if (total <= 66) return { score: total, level: "轻度倦怠", color: "yellow", advice: "您感到些许疲惫，建议在周末进行充分的休息，尝试一些放松活动。" };
    if (total <= 88) return { score: total, level: "中度倦怠", color: "orange", advice: "您出现了明显的职业倦怠，建议与同事或心理老师交流，适当调整教学压力。" };
    return { score: total, level: "重度倦怠", color: "red", advice: "您的职业倦怠情况严重，身心健康可能受到威胁，请务必安排长假休息并咨询专业人士。" };
  }
};

const PHQ9_OPTIONS = [
  { label: "完全没有", value: 0 },
  { label: "有几天", value: 1 },
  { label: "一半以上的日子", value: 2 },
  { label: "几乎每天", value: 3 },
];

// PHQ-9 (Patient Health Questionnaire-9) - Full 9 items
export const PHQ9_SCALE: Scale = {
  id: "phq9",
  name: "PHQ-9 抑郁症筛查量表",
  description: "简易、高效的抑郁症状筛查工具，评估过去两周内的情绪状态。",
  questions: [
    { id: 1, text: "做事提不起兴趣", options: PHQ9_OPTIONS },
    { id: 2, text: "情绪低落、沮丧或绝望", options: PHQ9_OPTIONS },
    { id: 3, text: "入睡困难、睡不安稳或睡得太多", options: PHQ9_OPTIONS },
    { id: 4, text: "感到疲倦或没有精力", options: PHQ9_OPTIONS },
    { id: 5, text: "食欲不振或暴饮暴食", options: PHQ9_OPTIONS },
    { id: 6, text: "觉得自己很失败或让人失望", options: PHQ9_OPTIONS },
    { id: 7, text: "很难集中注意力做事情", options: PHQ9_OPTIONS },
    { id: 8, text: "动作或说话缓慢，或坐立不安、烦躁易怒", options: PHQ9_OPTIONS },
    { id: 9, text: "有伤害自己或自杀的念头", options: PHQ9_OPTIONS },
  ],
  calculateResult: (scores) => {
    const total = scores.reduce((a, b) => a + b, 0);
    const hasSuicidalIdeation = scores[8] >= 1;

    let result = { score: total, level: "正常", color: "green", advice: "您的情绪状态良好，请继续保持。" };
    if (total >= 5 && total <= 9) result = { score: total, level: "轻度抑郁", color: "yellow", advice: "您存在轻微抑郁情绪，建议通过自我调节（如运动、倾诉）缓解。" };
    else if (total >= 10 && total <= 14) result = { score: total, level: "中度抑郁", color: "orange", advice: "您存在中度抑郁情绪，建议寻求专业心理咨询帮助。" };
    else if (total >= 15 && total <= 19) result = { score: total, level: "中重度抑郁", color: "red", advice: "您存在较重的抑郁情绪，建议及时就医进行专业评估。" };
    else if (total >= 20) result = { score: total, level: "重度抑郁", color: "red", advice: "您的抑郁情绪非常严重，请务必立即前往专业医疗机构寻求帮助。" };

    if (hasSuicidalIdeation) {
      result.advice = "【重要提示】您在自杀念头条目上有得分，无论总分多少，请务必立即联系专业心理医生或前往红色预警中心寻求紧急干预。" + result.advice;
    }
    return result;
  }
};

const GAD7_OPTIONS = [
  { label: "完全没有", value: 0 },
  { label: "有几天", value: 1 },
  { label: "一半以上的日子", value: 2 },
  { label: "几乎每天", value: 3 },
];

// GAD-7 (General Anxiety Disorder-7) - Full 7 items
export const GAD7_SCALE: Scale = {
  id: "gad7",
  name: "GAD-7 广泛性焦虑量表",
  description: "简易、高效的广泛性焦虑筛查工具，评估过去两周内的焦虑程度。",
  questions: [
    { id: 1, text: "感到紧张、焦虑 or 烦躁", options: GAD7_OPTIONS },
    { id: 2, text: "不能停止或控制担忧", options: GAD7_OPTIONS },
    { id: 3, text: "对各种各样的事情过分担忧", options: GAD7_OPTIONS },
    { id: 4, text: "难以放松下来", options: GAD7_OPTIONS },
    { id: 5, text: "由于不安而难以静坐", options: GAD7_OPTIONS },
    { id: 6, text: "变得容易烦恼或急躁", options: GAD7_OPTIONS },
    { id: 7, text: "感到害怕，好像有可怕的事情会发生", options: GAD7_OPTIONS },
  ],
  calculateResult: (scores) => {
    const total = scores.reduce((a, b) => a + b, 0);
    if (total <= 4) return { score: total, level: "正常", color: "green", advice: "您的焦虑水平在正常范围内，心理状态良好。" };
    if (total <= 9) return { score: total, level: "轻度焦虑", color: "yellow", advice: "您存在轻度焦虑，可通过深呼吸、冥想或规律作息自我调节。" };
    if (total <= 14) return { score: total, level: "中度焦虑", color: "orange", advice: "您存在中度焦虑，建议寻求专业心理咨询支持，避免症状加重。" };
    return { score: total, level: "重度焦虑", color: "red", advice: "您的焦虑水平较高，可能严重影响生活，请务必寻求专业医疗帮助。" };
  }
};

export const SCALES = [SCL90_SCALE, SAS_SCALE, SDS_SCALE, MBI_SCALE, PHQ9_SCALE, GAD7_SCALE];
