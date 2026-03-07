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

const SAS_OPTIONS = [
  { label: "没有或很少时间", value: 1 },
  { label: "小部分时间", value: 2 },
  { label: "相当多时间", value: 3 },
  { label: "绝大部分或全部时间", value: 4 },
];

// SAS (Self-Rating Anxiety Scale) - 20 items
export const SAS_SCALE: Scale = {
  id: "sas",
  name: "SAS 焦虑自评量表",
  description: "用于评定焦虑状态的轻重程度及其在治疗中的变化。",
  questions: [
    { id: 1, text: "我觉得比平时容易紧张和着急", options: SAS_OPTIONS },
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
    { id: 13, text: "我吸气呼气都感到很容易", options: SAS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 14, text: "我手脚麻木和刺痛", options: SAS_OPTIONS },
    { id: 15, text: "我由于胃痛和消化不良而苦恼", options: SAS_OPTIONS },
    { id: 16, text: "我常常要小便", options: SAS_OPTIONS },
    { id: 17, text: "我的手常是潮湿吃热的", options: SAS_OPTIONS },
    { id: 18, text: "我脸红发热", options: SAS_OPTIONS },
    { id: 19, text: "我容易入睡，并且睡得很好", options: SAS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 20, text: "我做噩梦", options: SAS_OPTIONS },
  ],
  calculateResult: (scores) => {
    const rawScore = scores.reduce((a, b) => a + b, 0);
    const standardScore = Math.floor(rawScore * 1.25);
    if (standardScore < 50) return { score: standardScore, level: "正常", color: "green", advice: "您的心理状态良好，请继续保持健康的生活方式。" };
    if (standardScore < 60) return { score: standardScore, level: "轻度焦虑", color: "yellow", advice: "您存在轻度焦虑，建议尝试蓝色调适驿站中的呼吸法或冥想练习。" };
    if (standardScore < 70) return { score: standardScore, level: "中度焦虑", color: "orange", advice: "您存在中度焦虑，建议寻求心理老师的专业指导，并适当减轻工作负担。" };
    return { score: standardScore, level: "重度焦虑", color: "red", advice: "您存在重度焦虑，请立即联系专业心理医生或前往红色预警中心寻求紧急干预。" };
  }
};

const MBI_OPTIONS = [
  { label: "从不", value: 0 },
  { label: "很少", value: 1 },
  { label: "有时", value: 2 },
  { label: "经常", value: 3 },
  { label: "频繁", value: 4 },
  { label: "总是", value: 5 },
];

// MBI (Maslach Burnout Inventory) - Educator Survey Subset
export const MBI_SCALE: Scale = {
  id: "mbi",
  name: "MBI 教师职业倦怠量表",
  description: "评估教师在工作中的情感耗竭、去个性化和个人成就感。",
  questions: [
    { id: 1, text: "我感到工作使我精疲力竭", options: MBI_OPTIONS },
    { id: 2, text: "下班时我感到筋疲力尽", options: MBI_OPTIONS },
    { id: 3, text: "早晨起床时想到又要面对一天的工作就感到疲劳", options: MBI_OPTIONS },
    { id: 4, text: "我能轻易理解学生对事物的感受", options: MBI_OPTIONS.map((o, i) => ({ ...o, value: 5 - i })) }, // Reverse for achievement
    { id: 5, text: "我觉得我对待某些学生就像对待没有生命的物体一样", options: MBI_OPTIONS },
    { id: 6, text: "整天和人工作对我来说确实是一种压力", options: MBI_OPTIONS },
    { id: 7, text: "我能非常有效地处理学生的问题", options: MBI_OPTIONS.map((o, i) => ({ ...o, value: 5 - i })) }, // Reverse
    { id: 8, text: "我感到由于工作我已精疲力竭", options: MBI_OPTIONS },
    { id: 9, text: "我觉得我通过工作对别人的生活产生了积极的影响", options: MBI_OPTIONS.map((o, i) => ({ ...o, value: 5 - i })) }, // Reverse
    { id: 10, text: "自从干了这份工作，我对人变得越来越冷淡", options: MBI_OPTIONS },
  ],
  calculateResult: (scores) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < 1.5) return { score: Math.round(avg * 20), level: "正常", color: "green", advice: "您对工作充满热情，职业成就感较高。" };
    if (avg < 2.5) return { score: Math.round(avg * 20), level: "轻度倦怠", color: "blue", advice: "您感到些许疲惫，建议在周末进行充分的休息和娱乐。" };
    if (avg < 3.5) return { score: Math.round(avg * 20), level: "中度倦怠", color: "orange", advice: "您出现了明显的职业倦怠，建议与同事交流，或尝试调整教学方法。" };
    return { score: Math.round(avg * 20), level: "重度倦怠", color: "red", advice: "您的职业倦怠情况严重，请务必安排长假休息，并咨询心理专家。" };
  }
};

const SCL90_OPTIONS = [
  { label: "从无", value: 1 },
  { label: "很轻", value: 2 },
  { label: "中等", value: 3 },
  { label: "偏重", value: 4 },
  { label: "严重", value: 5 },
];

// SCL-90 (Symptom Checklist-90) - Subset of first 15 items for demo
export const SCL90_SCALE: Scale = {
  id: "scl90",
  name: "SCL-90 症状自评量表",
  description: "综合评估心理健康状况，包含躯体化、强迫、抑郁等9个因子。",
  questions: [
    { id: 1, text: "头痛", options: SCL90_OPTIONS },
    { id: 2, text: "神经过敏，心中不踏实", options: SCL90_OPTIONS },
    { id: 3, text: "头脑中有不必要的想法或字句盘旋", options: SCL90_OPTIONS },
    { id: 4, text: "头晕或昏倒", options: SCL90_OPTIONS },
    { id: 5, text: "对异性的兴趣减退", options: SCL90_OPTIONS },
    { id: 6, text: "对旁人吹毛求疵", options: SCL90_OPTIONS },
    { id: 7, text: "感到别人能控制您的思想", options: SCL90_OPTIONS },
    { id: 8, text: "责备别人制造麻烦", options: SCL90_OPTIONS },
    { id: 9, text: "忘性大", options: SCL90_OPTIONS },
    { id: 10, text: "担心自己的衣饰整齐及仪态不端正", options: SCL90_OPTIONS },
    { id: 11, text: "容易烦恼和激动", options: SCL90_OPTIONS },
    { id: 12, text: "胸痛", options: SCL90_OPTIONS },
    { id: 13, text: "害怕空旷的场所或街道", options: SCL90_OPTIONS },
    { id: 14, text: "感到难以完成任务", options: SCL90_OPTIONS },
    { id: 15, text: "感到前途没有希望", options: SCL90_OPTIONS },
  ],
  calculateResult: (scores) => {
    const total = scores.reduce((a, b) => a + b, 0);
    const avg = total / scores.length;
    if (avg < 2) return { score: Math.round(avg * 20), level: "正常", color: "green", advice: "您的心理健康状况良好，请继续保持。" };
    if (avg < 3) return { score: Math.round(avg * 20), level: "轻度症状", color: "blue", advice: "您可能存在一些轻微的心理困扰，建议关注情绪变化。" };
    if (avg < 4) return { score: Math.round(avg * 20), level: "中度症状", color: "orange", advice: "您存在明显的心理症状，建议寻求心理咨询师的帮助。" };
    return { score: Math.round(avg * 20), level: "重度症状", color: "red", advice: "您的心理症状较为严重，请务必前往专业医疗机构进行诊断。" };
  }
};

const SDS_OPTIONS = [
  { label: "没有或很少时间", value: 1 },
  { label: "小部分时间", value: 2 },
  { label: "相当多时间", value: 3 },
  { label: "绝大部分或全部时间", value: 4 },
];

// SDS (Self-Rating Depression Scale) - 20 items
export const SDS_SCALE: Scale = {
  id: "sds",
  name: "SDS 抑郁自评量表",
  description: "用于衡量抑郁状态的轻重程度及其在治疗中的变化。",
  questions: [
    { id: 1, text: "我觉得闷闷不乐，情绪低沉", options: SDS_OPTIONS },
    { id: 2, text: "我觉得一天中早晨最好", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
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
    { id: 16, text: "我觉得做决定很容易", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 17, text: "我觉得自己是有用的人，有人需要我", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 18, text: "我的生活过得很有意思", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
    { id: 19, text: "我觉得如果我死了，别人会生活得更好", options: SDS_OPTIONS },
    { id: 20, text: "我仍然喜爱平时喜爱的东西", options: SDS_OPTIONS.map((o, i) => ({ ...o, value: 4 - i })) }, // Reverse
  ],
  calculateResult: (scores) => {
    const rawScore = scores.reduce((a, b) => a + b, 0);
    const standardScore = Math.floor(rawScore * 1.25);
    if (standardScore < 53) return { score: standardScore, level: "正常", color: "green", advice: "您的情绪状态良好，请继续保持积极的心态。" };
    if (standardScore < 63) return { score: standardScore, level: "轻度抑郁", color: "yellow", advice: "您可能存在轻度抑郁情绪，建议多参加社交活动，尝试蓝色调适工具。" };
    if (standardScore < 73) return { score: standardScore, level: "中度抑郁", color: "orange", advice: "您存在中度抑郁情绪，建议寻求专业心理咨询，并与亲友沟通。" };
    return { score: standardScore, level: "重度抑郁", color: "red", advice: "您存在重度抑郁情绪，请立即寻求专业医疗机构的诊断与治疗。" };
  }
};

export const SCALES = [SCL90_SCALE, SAS_SCALE, SDS_SCALE, MBI_SCALE];
