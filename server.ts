import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { db } from './src/lib/firebase-admin.ts';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
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

  app.post('/api/profile/theme', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      const { theme } = req.body;
      
      const profileRef = doc(db, 'profiles', user.id);
      await setDoc(profileRef, { theme }, { merge: true });
      
      res.json({ success: true, theme });
    } catch (error) {
      res.status(500).json({ error: "Failed to update theme" });
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
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      
      const profileRef = doc(db, 'profiles', user.id);
      const profileSnap = await getDoc(profileRef);
      
      let tokens = 20; // Default daily limit
      const today = new Date().toISOString().split('T')[0];
      
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        if (data.lastTokenReset === today) {
          tokens = data.tokens !== undefined ? data.tokens : 20;
        } else {
          // Reset for a new day
          tokens = 20;
        }
      }

      if (tokens <= 0) {
        return res.status(403).json({ error: "Daily AI token limit reached. Please try again tomorrow." });
      }

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

      // Deduct token
      tokens -= 1;
      await setDoc(profileRef, { tokens, lastTokenReset: today }, { merge: true });

      res.json({ reply: fullOutput, tokensRemaining: tokens });
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

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const { category } = req.query;
      
      // Order by percentile score, limit high to ensure we get enough after in-memory filtering
      const scoresQuery = query(collection(db, 'skillScores'), orderBy('percentileScore', 'desc'), limit(500));
      const scoresSnap = await getDocs(scoresQuery);
      
      if (scoresSnap.empty) {
        // Return mock data if db is completely empty
        const mockLeaderboard = [
          { userId: '1', fullName: 'Alice Johnson', collegeName: 'Stanford', topSkill: 'React', percentileScore: 99 },
          { userId: '2', fullName: 'Bob Smith', collegeName: 'MIT', topSkill: 'Node.js', percentileScore: 96 },
          { userId: '3', fullName: 'Charlie Davis', collegeName: 'Berkeley', topSkill: 'Python', percentileScore: 92 },
          { userId: '4', fullName: 'Diana Evans', collegeName: 'CMU', topSkill: 'Machine Learning', percentileScore: 88 }
        ];
        return res.json({ leaderboard: mockLeaderboard.filter(m => category === 'All' || m.topSkill === category) });
      }

      const leaderboard: any[] = [];
      const seenUsers = new Set();
      
      for (const d of scoresSnap.docs) {
        const score = { id: d.id, ...d.data() } as any;
        
        // In-memory filter for category
        if (category && category !== 'All' && score.competency !== category) {
          continue;
        }
        
        if (!seenUsers.has(score.userId)) {
          seenUsers.add(score.userId);
          
          const profileRef = doc(db, 'profiles', score.userId);
          const profileSnap = await getDoc(profileRef);
          const profile = profileSnap.exists() ? profileSnap.data() : { fullName: 'Anonymous Student' };
          
          leaderboard.push({
            userId: score.userId,
            fullName: profile.fullName || 'Anonymous',
            collegeName: profile.collegeName || '',
            topSkill: score.competency,
            percentileScore: score.percentileScore
          });
          
          if (leaderboard.length >= 20) break; // top 20 limit
        }
      }
      
      res.json({ leaderboard });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get('/api/student/dashboard', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      
      const subsSnapshot = await getDocs(query(collection(db, 'submissions'), where('studentId', '==', user.id)));
      let userSubmissions = subsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Auto-seed mock data for demonstration if empty
      if (userSubmissions.length === 0) {
        const mockSubs = [
          { title: "React Dashboard", url: "https://github.com/test/react-dash", comp: "React", score: 85, desc: "A robust dashboard built with React and Tailwind." },
          { title: "Node JS API", url: "https://github.com/test/node-api", comp: "Node.js", score: 92, desc: "A fast REST API with Express." },
          { title: "Python Data Scraper", url: "https://github.com/test/py-scraper", comp: "Python", score: 78, desc: "Web scraping script using BeautifulSoup." }
        ];

        for (const s of mockSubs) {
          const subRef = doc(collection(db, 'submissions'));
          await setDoc(subRef, {
            studentId: user.id,
            repoUrl: s.url,
            title: s.title,
            description: s.desc,
            status: 'analyzed',
            createdAt: new Date()
          });

          const scoreRef = doc(collection(db, 'skillScores'));
          await setDoc(scoreRef, {
            submissionId: subRef.id,
            userId: user.id,
            competency: s.comp,
            percentileScore: s.score,
            authenticityScore: 95,
            summaryText: `Excellent work on ${s.title} demonstrating strong skills.`,
            createdAt: new Date()
          });
        }
        
        // Re-fetch after seeding
        const newSubsSnapshot = await getDocs(query(collection(db, 'submissions'), where('studentId', '==', user.id)));
        userSubmissions = newSubsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      
      const submissionIds = userSubmissions.map(s => s.id);
      
      let scores: any[] = [];
      if (submissionIds.length > 0) {
         const scoresSnapshot = await getDocs(collection(db, 'skillScores'));
         scores = scoresSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((s: any) => submissionIds.includes(s.submissionId));
      }
      
      const challengesSnapshot = await getDocs(query(collection(db, 'challenges'), orderBy('createdAt', 'desc')));
      let allChallenges: any[] = challengesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (allChallenges.length === 0) {
        const mockChalRef = doc(collection(db, 'challenges'));
        await setDoc(mockChalRef, {
           title: "Optimize Sorting Algorithm",
           skillTag: "Algorithms",
           createdAt: new Date()
        });
        allChallenges = [{ id: mockChalRef.id, title: "Optimize Sorting Algorithm", skillTag: "Algorithms", createdAt: new Date() }];
      }
      
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

  app.post('/api/submissions/:id/endorse', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      const submissionId = req.params.id;
      
      const submissionRef = doc(db, 'submissions', submissionId);
      const submissionSnap = await getDoc(submissionRef);
      
      if (!submissionSnap.exists()) {
        return res.status(404).json({ error: "Submission not found" });
      }
      
      const submissionData = submissionSnap.data();
      let endorsements = submissionData.endorsements || [];
      
      if (endorsements.includes(user.id)) {
        endorsements = endorsements.filter((id: string) => id !== user.id);
      } else {
        endorsements.push(user.id);
      }
      
      await setDoc(submissionRef, { endorsements }, { merge: true });
      
      res.json({ success: true, endorsements });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to endorse submission" });
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
