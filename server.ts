import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from 'dotenv';
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/student-signup', async (req, res) => {
    try {
      const { accessCode, pseudoEmail, password, studentName } = req.body;
      
      // We use the admin API to create the user and bypass email confirmation.
      // This requires the SUPABASE_SERVICE_ROLE_KEY to be in the env variables.
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: pseudoEmail,
        password: password,
        email_confirm: true, // Bypass email confirmation
        user_metadata: { role: 'student', access_code: accessCode }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Create the profile via admin
        await supabaseAdmin.from('profiles').upsert({
          id: data.user.id,
          role: 'student',
          name: studentName,
          access_code: accessCode,
          high_score: 0
        });

        // Mark the access code as claimed
        await supabaseAdmin.from('access_codes').update({ claimed: true }).eq('code', accessCode);
      }

      res.json({ success: true, user: data.user });
    } catch (err: any) {
      console.error("Student signup error:", err);
      res.status(500).json({ error: err.message || "Failed to sign up student" });
    }
  });

  app.post('/api/delete-student', async (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }
      
      const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
      if (error) {
        throw error;
      }
      
      // Profiles and sessions should cascade, or we can manually delete them
      await supabaseAdmin.from('profiles').delete().eq('id', uid);
      await supabaseAdmin.from('game_sessions').delete().eq('user_id', uid);

      res.json({ success: true });
    } catch (err: any) {
      console.error("Student delete error:", err);
      res.status(500).json({ error: err.message || "Failed to delete student" });
    }
  });

  // Deepseek definitions
  app.post('/api/define', async (req, res) => {
    try {
      const { word } = req.body;
      if (!word) {
         res.status(400).json({ error: 'Word is required' });
         return;
      }
  
      const prompt = `Define the word "${word}" for a student. Provide the data in valid JSON format with the following keys:
  - "word": The word itself, correctly spelled.
  - "definition": A clear, concise definition.
  - "example": A simple example sentence.
  - "translation": The translation in Chinese.
  If the word is terribly misspelled and you can guess what they meant, correct the "word" field. If it forms no sense, return {"error": "Invalid word"}. Keep it strictly JSON without markdown wrappers.`;
  
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }]
        })
      });
  
      if (!response.ok) {
        const text = await response.text();
        console.error('DeepSeek API Error:', response.status, text);
        res.status(response.status).json({ error: 'DeepSeek API error', details: text });
        return;
      }
  
      const data = await response.json();
      let content = data.choices[0].message.content.trim();
      if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();
      
      res.json(JSON.parse(content));
    } catch (error) {
      console.error('DeepSeek Error:', error);
      res.status(500).json({ error: 'Failed to communicate with DeepSeek' });
    }
  });

  // AI Tools insights
  app.post('/api/vocab-insights', async (req, res) => {
    try {
      const { word, type } = req.body;
      let prompt = '';
      if (type === 'examples') {
        prompt = `Give me 3 practical example sentences for the word "${word}". Return ONLY a JSON list of strings, e.g. ["sentence 1", "sentence 2", "sentence 3"]`;
      } else if (type === 'usage') {
        prompt = `Explain the usage notes, common collocations, and nuances of the word "${word}". Return ONLY JSON in this format: {"notes": "...", "collocations": ["...", "..."]}`;
      } else {
        res.status(400).json({ error: 'Invalid insight type' });
        return;
      }
  
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }]
        })
      });
  
      if (!response.ok) throw new Error('DeepSeek API Error');
      const data = await response.json();
      let content = data.choices[0].message.content.trim();
      if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();
      
      res.json(JSON.parse(content));
    } catch (err) {
      console.error('DeepSeek Error:', err);
      res.status(500).json({ error: 'Failed to generate insight' });
    }
  });
  
  app.post('/api/check-sentence', async (req, res) => {
    try {
      const { word, sentence } = req.body;
      const prompt = `The student has written the following sentence using the word "${word}": "${sentence}". 
  Check if the sentence is grammatically correct and uses the word correctly. Pay special attention to Chinese ESL common mistakes.
  Return ONLY JSON in this exact format: {"correct": boolean, "feedback": "Your explanation here"}`;
  
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }]
        })
      });
  
      if (!response.ok) throw new Error('DeepSeek API Error');
      const data = await response.json();
      let content = data.choices[0].message.content.trim();
      if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();
      
      res.json(JSON.parse(content));
    } catch (err) {
      console.error('DeepSeek Error:', err);
      res.status(500).json({ error: 'Failed to check sentence' });
    }
  });

  // Vite middleware for development
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
