import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { db } from './src/lib/firebase-admin.ts';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { GoogleGenAI, Type, Schema, LiveServerMessage, Modality } from '@google/genai';
import { WebSocketServer } from 'ws';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function fetchGithubRepoData(repoUrl: string) {
  try {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return { error: "Invalid GitHub URL" };
    const owner = match[1];
    const repo = match[2].replace('.git', '');
    
    const headers = { 'User-Agent': 'ProofStack-App' };
    
    const [repoRes, readmeRes, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers })
    ]);
    
    let readme = "No README found.";
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      if (readmeData.content) {
        readme = Buffer.from(readmeData.content, 'base64').toString('utf-8');
      }
    }
    
    let commits = [];
    if (commitsRes.ok) {
      commits = await commitsRes.json();
    }
    
    return {
      name: repo,
      readme: readme.substring(0, 5000), 
      recentCommits: commits.map((c: any) => ({
        message: c.commit.message,
        date: c.commit.author.date,
      }))
    };
  } catch (e) {
    console.error("GitHub fetch error:", e);
    return { error: "Failed to fetch from GitHub" };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      
      const profileDoc = await getDoc(doc(db, 'profiles', user.id));
      if (profileDoc.exists()) {
        res.json({ user, profile: { id: profileDoc.id, ...profileDoc.data() } });
      } else {
        res.json({ user, profile: null });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post('/api/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      const { fullName, role, collegeName } = req.body;
      
      const profileRef = doc(db, 'profiles', user.id);
      const profileData = {
        userId: user.id,
        fullName,
        role,
        collegeName,
        createdAt: new Date()
      };
      await setDoc(profileRef, profileData, { merge: true });
      
      res.json({ id: user.id, ...profileData });
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post('/api/verify', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      const { repoUrl, title, description } = req.body;

      // 1. Fetch Github data
      const githubData = await fetchGithubRepoData(repoUrl);
      
      // 2. Insert pending submission
      const submissionRef = doc(collection(db, 'submissions'));
      const submissionData = {
        studentId: user.id,
        repoUrl,
        title,
        description,
        status: 'analyzing',
        createdAt: new Date()
      };
      await setDoc(submissionRef, submissionData);

      // 3. Analyze with Gemini (using 3.1-pro-preview with HIGH thinking)
      const prompt = `
        Analyze this student's GitHub repository for their portfolio.
        Repository URL: ${repoUrl}
        Project Title: ${title}
        Student's Description: ${description}
        
        GitHub Data:
        ${JSON.stringify(githubData, null, 2)}
        
        Assess the following:
        1. Evidence of incremental, genuine development (multiple commits over time vs one dump).
        2. Code complexity relative to claimed skill level.
        
        Provide your assessment as JSON.
        Required JSON fields:
        "competency": string (primary skill e.g. "React", "Node.js", "Python")
        "percentileScore": integer (0-100)
        "authenticityScore": integer (0-100)
        "summaryText": string (2-3 sentences plain-language summary)
      `;

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          competency: { type: Type.STRING },
          percentileScore: { type: Type.INTEGER },
          authenticityScore: { type: Type.INTEGER },
          summaryText: { type: Type.STRING }
        },
        required: ["competency", "percentileScore", "authenticityScore", "summaryText"]
      };

      const interaction = await ai.interactions.create({
        model: 'gemini-3.1-pro-preview',
        input: prompt,
        generation_config: {
          thinking_level: "HIGH",
        }
      });
      
      let fullOutput = "";
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          const textContent = step.content?.find(c => c.type === 'text');
          if (textContent && textContent.text) {
            fullOutput += textContent.text;
          }
        }
      }

      let analysis: any = {};
      const jsonMatch = fullOutput.match(/\`\`\`json\s*([\s\S]*?)\s*\`\`\`/) || fullOutput.match(/([\{\[][\s\S]*[\}\]])/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[1]);
        } catch (e) {
          console.error("Failed to parse agent json", e);
        }
      }

      // 4. Update submission and save scores
      await updateDoc(submissionRef, { status: 'analyzed' });
      
      const scoreRef = doc(collection(db, 'skillScores'));
      const scoreData = {
        submissionId: submissionRef.id,
        competency: analysis.competency || 'Unknown',
        percentileScore: analysis.percentileScore || 50,
        authenticityScore: analysis.authenticityScore || 50,
        summaryText: analysis.summaryText || 'Analysis failed to generate a summary.',
        createdAt: new Date()
      };
      await setDoc(scoreRef, scoreData);

      res.json({ 
        submission: { id: submissionRef.id, ...submissionData, status: 'analyzed' }, 
        score: { id: scoreRef.id, ...scoreData } 
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post('/api/chat', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { message, history } = req.body;
      
      // We will use low latency flash-lite as required by the user prompt
      const inputHistory = history ? history.map((m: any) => ({
        role: m.role,
        parts: [{ text: m.text }]
      })) : [];

      const prompt = `User message: ${message}
      
      Previous conversation:
      ${JSON.stringify(inputHistory)}
      `;

      const interaction = await ai.interactions.create({
        model: 'gemini-3.1-flash-lite',
        input: prompt,
        system_instruction: "You are an AI assistant helping students and recruiters on the ProofStack platform.",
      });

      let fullOutput = "";
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          const textContent = step.content?.find(c => c.type === 'text');
          if (textContent && textContent.text) {
            fullOutput += textContent.text;
          }
        }
      }

      res.json({ reply: fullOutput });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Chat failed" });
    }
  });

  app.get('/api/search', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { query } = req.query;
      const interaction = await ai.interactions.create({
        model: 'gemini-3.5-flash',
        input: String(query),
        tools: [{ type: 'google_search' }]
      });

      let fullOutput = "";
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          const textContent = step.content?.find(c => c.type === 'text');
          if (textContent && textContent.text) {
            fullOutput += textContent.text;
          }
        }
      }

      res.json({ result: fullOutput });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.get('/api/student/dashboard', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      
      const subsSnapshot = await getDocs(query(collection(db, 'submissions'), where('studentId', '==', user.id)));
      const userSubmissions = subsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const submissionIds = userSubmissions.map(s => s.id);
      
      let scores: any[] = [];
      if (submissionIds.length > 0) {
         // Query batches of 10 if necessary, but here we'll just fetch all and filter for simplicity
         const scoresSnapshot = await getDocs(collection(db, 'skillScores'));
         scores = scoresSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((s: any) => submissionIds.includes(s.submissionId));
      }
      
      const challengesSnapshot = await getDocs(query(collection(db, 'challenges'), orderBy('createdAt', 'desc')));
      const allChallenges = challengesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      res.json({
        submissions: userSubmissions,
        scores: scores,
        challenges: allChallenges
      });
      
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  app.get('/api/recruiter/dashboard', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profilesSnapshot = await getDocs(query(collection(db, 'profiles'), where('role', '==', 'student')));
      const allProfiles = profilesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const studentUserIds = allProfiles.map((p: any) => p.userId);
      
      let allSubmissions: any[] = [];
      let allScores: any[] = [];
      
      if (studentUserIds.length > 0) {
        const subsSnapshot = await getDocs(collection(db, 'submissions'));
        allSubmissions = subsSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((s: any) => studentUserIds.includes(s.studentId));
        
        const subIds = allSubmissions.map(s => s.id);
        if (subIds.length > 0) {
            const scSnapshot = await getDocs(collection(db, 'skillScores'));
            allScores = scSnapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((s: any) => subIds.includes(s.submissionId));
        }
      }
      
      res.json({
        students: allProfiles,
        submissions: allSubmissions,
        scores: allScores
      });
      
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  app.post('/api/challenges', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      const { title, description, skillTag } = req.body;
      
      const challengeRef = doc(collection(db, 'challenges'));
      const challengeData = {
        recruiterId: user.id,
        title,
        description,
        skillTag,
        createdAt: new Date()
      };
      await setDoc(challengeRef, challengeData);
      
      res.json({ id: challengeRef.id, ...challengeData });
    } catch (error) {
      res.status(500).json({ error: "Failed to create challenge" });
    }
  });

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // --- WEBSOCKET SERVER FOR LIVE API ---
  const wss = new WebSocketServer({ server: httpServer, path: '/live' });
  
  wss.on("connection", async (clientWs) => {
    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) clientWs.send(JSON.stringify({ audio }));
            if (message.serverContent?.interrupted)
              clientWs.send(JSON.stringify({ interrupted: true }));
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a helpful assistant for the ProofStack platform.",
        },
      });

      clientWs.on("message", (data) => {
        try {
          const { audio } = JSON.parse(data.toString());
          if (audio) {
            session.sendRealtimeInput({
              audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.error("Live API WS message error", e);
        }
      });
      
      clientWs.on("close", () => {
        // close the live session
        // no-op for now unless the SDK has a close method
      });
    } catch (e) {
      console.error("Failed to connect to Gemini Live", e);
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();
