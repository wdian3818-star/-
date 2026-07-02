import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { wordQuestions, sentenceQuestions, phraseQuestions } from "./src/data/questions";
import { GoogleGenAI } from "@google/genai";
import { LeaderboardEntry } from "./src/types";
import { getDb } from "./src/lib/firebase-server";


const BACKUP_FILE = path.join(process.cwd(), "user_mistakes_backup.json");

// Ensure existing backup file is accessible (read/write for all users) so the IDE service can download and display it
try {
  if (fs.existsSync(BACKUP_FILE)) {
    fs.chmodSync(BACKUP_FILE, 0o666);
  }
} catch (err) {
  console.warn("Failed to set BACKUP_FILE permissions on server startup:", err);
}

interface LocalMistakeStructure {
  [username: string]: {
    word: { [qId: string]: any };
    phrase: { [qId: string]: any };
    sentence: { [qId: string]: any };
  };
}

function loadLocalMistakes(): LocalMistakeStructure {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      return JSON.parse(fs.readFileSync(BACKUP_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to load local mistakes backup file:", err);
  }
  return {};
}

function saveLocalMistake(username: string, quizType: string, question: any) {
  try {
    const data = loadLocalMistakes();
    const user = String(username).trim();
    if (!data[user]) {
      data[user] = { word: {}, phrase: {}, sentence: {} };
    }
    const type = String(quizType) as 'word' | 'phrase' | 'sentence';
    if (data[user][type]) {
      data[user][type][question.id] = question;
    }
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), "utf-8");
    try {
      fs.chmodSync(BACKUP_FILE, 0o666);
    } catch (chmodErr) {
      console.warn("Failed to chmod backup file on save:", chmodErr);
    }
  } catch (err) {
    console.error("Failed to save local mistake:", err);
  }
}

function removeLocalMistake(username: string, quizType: string, questionId: string) {
  try {
    const data = loadLocalMistakes();
    const user = String(username).trim();
    if (data[user]) {
      const type = String(quizType) as 'word' | 'phrase' | 'sentence';
      if (data[user][type]) {
        delete data[user][type][questionId];
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), "utf-8");
        try {
          fs.chmodSync(BACKUP_FILE, 0o666);
        } catch (chmodErr) {
          console.warn("Failed to chmod backup file on remove:", chmodErr);
        }
      }
    }
  } catch (err) {
    console.error("Failed to remove local mistake:", err);
  }
}

function getLocalMistakes(username: string, quizType?: string): any[] {
  try {
    const data = loadLocalMistakes();
    const user = String(username).trim();
    if (!data[user]) return [];
    
    if (quizType) {
      const type = String(quizType) as 'word' | 'phrase' | 'sentence';
      return Object.values(data[user][type] || {});
    } else {
      return [
        ...Object.values(data[user].word || {}),
        ...Object.values(data[user].phrase || {}),
        ...Object.values(data[user].sentence || {})
      ];
    }
  } catch (err) {
    console.error("Failed to get local mistakes:", err);
    return [];
  }
}

// Lazy-initialized Gemini client to prevent crash if key is missing on startup
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY 环境变量未配置。请在 AI Studio 的 Secrets 面板中添加它。");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json());

// In-memory databases with preloaded mock records for junior high atmosphere
let leaderboardStore: LeaderboardEntry[] = [
  { username: "中考学霸小明", score: 100, date: "2026-07-01", quizType: "单词测试" },
  { username: "语法小达人小红", score: 100, date: "2026-07-01", quizType: "句子语法测试" },
  { username: "短语狂魔大华", score: 100, date: "2026-07-01", quizType: "常用短语测试" },
  { username: "逆袭黑马小林", score: 80, date: "2026-07-01", quizType: "单词测试" },
  { username: "天天向上阿杰", score: 80, date: "2026-07-01", quizType: "句子语法测试" },
  { username: "英语之星乐乐", score: 60, date: "2026-07-01", quizType: "单词测试" }
];

// Helper to shuffle arrays and pick N elements
function getRandomElements<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

async function seedDatabase() {
  const db = getDb();
  if (!db) {
    console.log("Firestore DB not initialized. Skipping database seeding.");
    return;
  }

  try {
    const snapshot = await db.collection("questions").get();
    
    const totalLocalQuestions = wordQuestions.length + phraseQuestions.length + sentenceQuestions.length;
    let needsReseed = false;
    snapshot.forEach((doc: any) => {
      if (doc.id === "w1" || doc.id === "p1" || doc.id === "s1") {
        needsReseed = true;
      }
    });

    if (snapshot.size !== totalLocalQuestions) {
      needsReseed = true;
    }

    if (needsReseed) {
      console.log(`Detected question count mismatch (Firestore: ${snapshot.size}, Local: ${totalLocalQuestions}) or placeholders. Clearing old database records for Unit 1...`);
      for (const d of snapshot.docs) {
        await d.ref.delete();
      }
      console.log("Database cleared successfully. Proceeding to seed Unit 1 questions...");
    } else if (snapshot.size > 0) {
      console.log("Database already contains Unit 1 questions. Skipping seeding.");
      return;
    }

    console.log("Seeding database with extracted Unit 1 questions...");
    
    for (const q of wordQuestions) {
      await db.collection("questions").doc(q.id).set({ ...q, category: "word" });
    }
    for (const q of phraseQuestions) {
      await db.collection("questions").doc(q.id).set({ ...q, category: "phrase" });
    }
    for (const q of sentenceQuestions) {
      await db.collection("questions").doc(q.id).set({ ...q, category: "sentence" });
    }
    console.log(`Seeding complete! Successfully added ${totalLocalQuestions} Unit 1 questions to Firestore.`);
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}

// API Routes

// Helper for local question fallback
function handleLocalFallback(type: string, res: any) {
  if (type === "word") {
    const selected = getRandomElements(wordQuestions, 5);
    return res.json({ success: true, questions: selected });
  } else if (type === "sentence") {
    const selected = getRandomElements(sentenceQuestions, 5);
    return res.json({ success: true, questions: selected });
  } else if (type === "phrase") {
    const selected = getRandomElements(phraseQuestions, 5);
    return res.json({ success: true, questions: selected });
  } else {
    return res.status(400).json({ success: false, error: "Invalid quiz type." });
  }
}

// 1. Get 5 random questions based on quiz type
app.get("/api/questions", async (req, res) => {
  const type = req.query.type as string;
  try {
    const db = getDb();
    if (!db) {
      console.warn("Firebase DB not initialized in /api/questions, falling back to local files.");
      return handleLocalFallback(type, res);
    }

    try {
      const snapshot = await db.collection("questions").where("category", "==", type).get();
      let questions: any[] = [];
      snapshot.forEach((doc: any) => {
        questions.push({ ...doc.data() });
      });

      if (questions.length === 0) {
        await seedDatabase();
        const retrySnapshot = await db.collection("questions").where("category", "==", type).get();
        retrySnapshot.forEach((doc: any) => {
          questions.push({ ...doc.data() });
        });
      }

      const selected = getRandomElements(questions, 5);
      return res.json({ success: true, questions: selected });
    } catch (dbError: any) {
      console.warn("Firestore questions collection query failed. Falling back to local files. Error:", dbError.message);
      return handleLocalFallback(type, res);
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Submit score to leaderboard
app.post("/api/leaderboard/submit", (req, res) => {
  const { username, score, quizType } = req.body;
  if (!username || score === undefined || !quizType) {
    return res.status(400).json({ success: false, error: "Missing required fields: username, score, quizType." });
  }

  const newEntry: LeaderboardEntry = {
    username: String(username).trim().substring(0, 15),
    score: Number(score),
    date: new Date().toISOString().split('T')[0],
    quizType: String(quizType)
  };

  leaderboardStore.push(newEntry);
  // Keep only top 50, sorted by score descending
  leaderboardStore.sort((a, b) => b.score - a.score);
  leaderboardStore = leaderboardStore.slice(0, 50);

  return res.json({ success: true, leaderboard: leaderboardStore });
});

// 3. Get leaderboard
app.get("/api/leaderboard", (req, res) => {
  return res.json({ success: true, leaderboard: leaderboardStore });
});

// 3.1. Get user's mistakes
app.get("/api/mistakes", async (req, res) => {
  const { username, type } = req.query;
  if (!username) {
    return res.status(400).json({ success: false, error: "Missing required query parameter: username" });
  }
  
  try {
    const db = getDb();
    let mistakes: any[] = [];
    let querySuccess = false;

    if (db) {
      try {
        const snapshot = await db.collection("user_mistakes")
          .where("username", "==", String(username).trim())
          .where("quizType", "==", String(type))
          .get();
        snapshot.forEach((doc: any) => {
          mistakes.push(doc.data().question);
        });
        querySuccess = true;
      } catch (dbError: any) {
        console.warn("Firestore user_mistakes query failed. Falling back to local backup. Error:", dbError.message);
      }
    }

    // Fallback or merge with local backup
    if (!querySuccess || mistakes.length === 0) {
      mistakes = getLocalMistakes(String(username), String(type));
    }

    return res.json({ success: true, mistakes });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3.2. Add user mistakes
app.post("/api/mistakes/add", async (req, res) => {
  const { username, quizType, questions } = req.body;
  if (!username || !quizType || !Array.isArray(questions)) {
    return res.status(400).json({ success: false, error: "Missing required fields: username, quizType, questions." });
  }

  try {
    // 1. Always write to local backup
    for (const question of questions) {
      saveLocalMistake(String(username), String(quizType), question);
    }

    // 2. Attempt to write to Firestore
    const db = getDb();
    if (db) {
      try {
        for (const question of questions) {
          const docId = `${String(username).trim()}_${String(quizType)}_${question.id}`;
          await db.collection("user_mistakes").doc(docId).set({
            username: String(username).trim(),
            quizType: String(quizType),
            questionId: question.id,
            question,
            createdAt: new Date().toISOString()
          });
        }
      } catch (dbError: any) {
        console.warn("Firestore setDoc for user_mistakes failed. Error:", dbError.message);
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3.3. Remove user mistakes (when answered correctly)
app.post("/api/mistakes/remove", async (req, res) => {
  const { username, quizType, questionIds } = req.body;
  if (!username || !quizType || !Array.isArray(questionIds)) {
    return res.status(400).json({ success: false, error: "Missing required fields: username, quizType, questionIds." });
  }

  try {
    // 1. Always remove from local backup
    for (const qId of questionIds) {
      removeLocalMistake(String(username), String(quizType), qId);
    }

    // 2. Attempt to delete from Firestore
    const db = getDb();
    if (db) {
      try {
        for (const qId of questionIds) {
          const docId = `${String(username).trim()}_${String(quizType)}_${qId}`;
          await db.collection("user_mistakes").doc(docId).delete();
        }
      } catch (dbError: any) {
        console.warn("Firestore deleteDoc for user_mistakes failed. Error:", dbError.message);
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3.4. GET /api/wrong-book - Get all user's mistakes
app.get("/api/wrong-book", async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ success: false, error: "Missing required query parameter: username" });
  }

  try {
    const db = getDb();
    let wordMistakes: any[] = [];
    let phraseMistakes: any[] = [];
    let sentenceMistakes: any[] = [];
    let querySuccess = false;

    if (db) {
      try {
        const snapshot = await db.collection("user_mistakes")
          .where("username", "==", String(username).trim())
          .get();
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          const qType = data.quizType;
          if (qType === 'word') {
            wordMistakes.push(data.question);
          } else if (qType === 'phrase') {
            phraseMistakes.push(data.question);
          } else if (qType === 'sentence') {
            sentenceMistakes.push(data.question);
          }
        });
        querySuccess = true;
      } catch (dbError: any) {
        console.warn("Firestore wrong-book query failed, falling back to local storage. Error:", dbError.message);
      }
    }

    // Fallback or merge with local backup if query failed or has mismatch
    if (!querySuccess || (wordMistakes.length === 0 && phraseMistakes.length === 0 && sentenceMistakes.length === 0)) {
      wordMistakes = getLocalMistakes(String(username), "word");
      phraseMistakes = getLocalMistakes(String(username), "phrase");
      sentenceMistakes = getLocalMistakes(String(username), "sentence");
    }

    return res.json({
      success: true,
      wordMistakes,
      phraseMistakes,
      sentenceMistakes
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3.5. POST /api/submit - Submit quiz results, calculate score, record mistakes
app.post("/api/submit", async (req, res) => {
  const { username, quizType, answers } = req.body;
  if (!username || !quizType || !Array.isArray(answers)) {
    return res.status(400).json({ success: false, error: "Missing required fields: username, quizType, answers." });
  }

  try {
    const db = getDb();
    const results: any[] = [];
    const incorrects: any[] = [];
    const corrects: any[] = [];

    let score = 0;

    for (const item of answers) {
      const q = item.question;
      const studentAns = String(item.selectedAnswer || "").trim();
      let isCorrect = false;

      if (quizType === 'word' || quizType === 'phrase') {
        const correctOption = q.options[q.answerIndex];
        isCorrect = studentAns.toLowerCase() === String(correctOption).toLowerCase() || 
                    studentAns === String(q.answerIndex);
      } else if (quizType === 'sentence') {
        if (q.type === 'order') {
          const expectedAnswerStr = Array.isArray(q.answer)
            ? (q.answer as string[]).join(" ")
            : (q.answer as string);
          
          const cleanText = (str: string) => str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").replace(/\s+/g, " ").trim();
          isCorrect = cleanText(studentAns) === cleanText(expectedAnswerStr);
        } else {
          const expected = String(q.answer).toLowerCase().trim();
          const student = studentAns.toLowerCase();
          
          if (expected.includes("/")) {
            const parts = expected.split("/").map(p => p.trim());
            isCorrect = parts.includes(student);
          } else {
            isCorrect = student === expected;
          }
        }
      }

      if (isCorrect) {
        score += 1;
        corrects.push(q);
      } else {
        incorrects.push(q);
      }

      results.push({
        question: q,
        selectedAnswer: item.selectedAnswer,
        isCorrect
      });
    }

    const activeUser = String(username).trim();

    // 1. Always record in local backup
    for (const question of incorrects) {
      saveLocalMistake(activeUser, String(quizType), question);
    }
    for (const question of corrects) {
      removeLocalMistake(activeUser, String(quizType), question.id);
    }

    // 2. Attempt to write to Firestore
    if (db) {
      try {
        // Save incorrects to user_mistakes
        for (const question of incorrects) {
          const docId = `${activeUser}_${String(quizType)}_${question.id}`;
          await db.collection("user_mistakes").doc(docId).set({
            username: activeUser,
            quizType: String(quizType),
            questionId: question.id,
            question,
            createdAt: new Date().toISOString()
          });
        }

        // Remove correct answers from user_mistakes
        for (const question of corrects) {
          const docId = `${activeUser}_${String(quizType)}_${question.id}`;
          await db.collection("user_mistakes").doc(docId).delete();
        }
      } catch (dbError: any) {
        console.warn("Firestore setDoc/deleteDoc in /api/submit failed. Error:", dbError.message);
      }
    }

    return res.json({
      success: true,
      score,
      total: answers.length,
      scorePercentage: Math.round((score / answers.length) * 100),
      results,
      incorrects
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Gemini AI detailed humorous teacher explanation
app.post(["/api/explain", "/api/ai-explain"], async (req, res) => {
  const { question, userAnswer, type } = req.body;

  if (!question) {
    return res.status(400).json({ success: false, error: "Missing question payload." });
  }

  try {
    const ai = getAiClient();

    let questionDesc = "";
    if (type === "word") {
      questionDesc = `
单词: "${question.word}" ${question.phonetic || ""}
词性: ${question.partOfSpeech || ""}
正确翻译: "${question.options[question.answerIndex]}"
学生选择的错误选项: "${userAnswer || "未作答"}"
考点/解析提示: ${question.keyPoint || ""}
`;
    } else if (type === "phrase") {
      questionDesc = `
常用短语: "${question.word}" ${question.phonetic || ""}
短语属性: ${question.partOfSpeech || ""}
正确翻译: "${question.options[question.answerIndex]}"
学生选择的错误选项: "${userAnswer || "未作答"}"
考点/解析/使用场景与易混短语提示: ${question.keyPoint || ""}
`;
    } else {
      questionDesc = `
句子语法题: "${question.chinese}"
英文原句模板: "${question.englishTemplate}"
正确答案: "${Array.isArray(question.answer) ? (question.answer as string[]).join(" ") : question.answer}"
学生提交的答案: "${userAnswer || "未作答"}"
考点/解析提示: ${question.keyPoint || ""}
`;
    }

    const systemPrompt = `
你是一位极其幽默、活泼、充满亲和力的初中英语老师（比如叫“大麦老师”或“Miss Li”）。
你的听众是12-15岁的初中生，他们有时觉得英语枯燥。所以你讲课喜欢用生动幽默的比喻、网络热梗、或者是接地气的故事。
你需要针对学生答错或需要学习的这道题目，输出一段极其有趣且易懂的详细解析。

对于“常用短语”题目（type为phrase），你必须在解析中：
1. 精准指出该短语的具体日常/中考高频【使用场景】（例如造一个贴近学生生活好玩的句子，并进行精辟讲解）。
2. 特别针对【易混淆短语】进行清爽好懂的PK区分（例如对比 take care of 和 take care 或是 look forward to 和 look for ），用拟人、段子等形式讲解，防止学生下次掉进同一个坑里！

输出结构要求：
1. 【老师碎碎念】：用1-2句超级幽默、宠溺、略带调侃（但绝对鼓励）的语气开场（比如：“哎呀我的老铁，这题选错可要扣鸡腿了！”）。
2. 【核心考点大揭秘】：用初中生绝对能听懂、甚至觉得很好玩的大白话解释这个单词、词组、短语或者句子的语法机制。
3. 【记忆金牌顺口溜】：**必填项**，创作一个朗朗上口、押韵、好玩的中文/英文混合记忆顺口溜或口诀，帮助孩子一秒记住这个核心知识点。
4. 【温暖鼓励】：最后用一句话热血鼓励一下，给孩子加油打气！

字数控制在300字左右，排版要清晰，多使用Emoji来丰富表情，让初中生看起来不觉得累！
`;

    const userPrompt = `
请解析以下这道初中英语题目：
${questionDesc}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
      }
    });

    const explanation = response.text || "AI 老师开小差了，请再试一次哦！";
    return res.json({ success: true, explanation });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "调用 AI 接口失败，请检查 GEMINI_API_KEY 环境变量配置。"
    });
  }
});

// Serve frontend assets
async function startServer() {
  // Seed the Firestore database if it's initialized and empty
  await seedDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
