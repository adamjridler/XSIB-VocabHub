import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from 'dotenv';
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase URL and Service Key are required to use this feature. Please set them in your environment variables.");
  }
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabaseAdmin;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/student-signup', async (req, res) => {
    try {
      const { accessCode, pseudoEmail, password, studentName } = req.body;
      
      // We use the admin API to create the user and bypass email confirmation.
      // This requires the SUPABASE_SERVICE_ROLE_KEY to be in the env variables.
      const admin = getSupabaseAdmin();
      const { data, error } = await admin.auth.admin.createUser({
        email: pseudoEmail,
        password: password,
        email_confirm: true, // Bypass email confirmation
        user_metadata: { role: 'student', access_code: accessCode, name: studentName }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Create the profile via admin
        await admin.from('profiles').upsert({
          id: data.user.id,
          role: 'student',
          name: studentName,
          access_code: accessCode,
          high_score: 0
        });
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
      
      const admin = getSupabaseAdmin();
      const { error } = await admin.auth.admin.deleteUser(uid);
      if (error) {
        throw error;
      }
      
      // Profiles and sessions should cascade, or we can manually delete them
      await admin.from('profiles').delete().eq('id', uid);
      await admin.from('game_sessions').delete().eq('user_id', uid);

      res.json({ success: true });
    } catch (err: any) {
      console.error("Student delete error:", err);
      res.status(500).json({ error: err.message || "Failed to delete student" });
    }
  });

  app.post('/api/reset-student-password', async (req, res) => {
    try {
      const { uid, newPassword } = req.body;
      if (!uid || !newPassword) {
        res.status(400).json({ error: 'UID and new password are required' });
        return;
      }
      
      const admin = getSupabaseAdmin();
      const { data, error } = await admin.auth.admin.updateUserById(uid, {
        password: newPassword
      });

      if (error) {
        throw error;
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Student password reset error:", err);
      res.status(500).json({ error: err.message || "Failed to reset student password" });
    }
  });

  app.post('/api/reset-all-scores', async (req, res) => {
    try {
      const admin = getSupabaseAdmin();
      
      const { error: error1 } = await admin.from('game_sessions').delete().neq('id', 'dummy_id');
      if (error1) throw error1;

      const { error: error2 } = await admin.from('profiles').update({ high_score: 0 }).eq('role', 'student');
      if (error2) throw error2;

      res.json({ success: true });
    } catch (err: any) {
      console.error("Reset all scores error:", err);
      res.status(500).json({ error: err.message || "Failed to reset scores" });
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
  
      const prompt = `Define the word "${word}" for a high-school student. Provide the data in valid JSON format with the following keys:
  - "word": The word itself, correctly spelled.
  - "definition": A clear, concise definition (max 2 short sentences). CRITICAL: Do NOT include the target word ("${word}") or any of its root variants in the definition.
  - "example": A simple example sentence appropriate for high-school level.
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

  app.post('/api/variants', async (req, res) => {
    try {
      const { word } = req.body;
      if (!word) {
         res.status(400).json({ error: 'Word is required' });
         return;
      }
  
      const prompt = `Provide 3 different or alternative meanings/definitions for the English word "${word}" suitable for high-school students. 
Return ONLY a JSON array of objects without markdown wrappers. Each object MUST have the following keys:
- "definition": A clear, concise definition for this specific variant (max 2 short sentences). Do NOT include the target word ("${word}") or any of its root variants in the definition.
- "example": A simple example sentence using this variant.
- "translation": The translation of this variant in Simplified Chinese.`;
  
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
        res.status(response.status).json({ error: 'DeepSeek API error' });
        return;
      }
  
      const data = await response.json();
      let content = data.choices[0].message.content.trim();
      if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();
      
      let variants = JSON.parse(content);
      if (!Array.isArray(variants)) {
        variants = [variants];
      }
      res.json({ variants });
    } catch (error) {
      console.error('DeepSeek Error:', error);
      res.status(500).json({ error: 'Failed to fetch variants' });
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
        prompt = `For the word "${word}", provide its part of speech, usage context, common collocations, and a list of different forms of the word (e.g. noun, verb, adjective). Return ONLY JSON in this format: {"partOfSpeech": "...", "notes": "...", "collocations": ["...", "..."], "forms": ["...", "..."]}`;
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

  app.post('/api/generate-blanks', async (req, res) => {
    try {
      const { words } = req.body;
      if (!words || !Array.isArray(words)) {
        res.status(400).json({ error: 'Words array is required' });
        return;
      }

      const limitedWords = words.slice(0, 5);
      const prompt = `Write an engaging paragraph appropriate for high school students that uses EXACTLY the following ${limitedWords.length} vocabulary words: ${limitedWords.join(', ')}. 
      STRICT REQUIREMENT: Provide enough context and descriptive clues around each word so that a student can logically deduce the correct vocabulary word from the surrounding text. The paragraph can be as long as needed to provide good context, typically 3 to 6 sentences.
      Replace the occurrences of those specific words in the text with <blank:0>, <blank:1>, <blank:2>, etc., making sure the numbering starts at 0.
      Only return JSON in this exact format, with no other text or explanation:
      {
        "text": "The paragraph with <blank:0> and <blank:1> replacements...",
        "answers": [
          "first_vocab_word_for_blank_0",
          "second_vocab_word_for_blank_1"
        ]
      }`;

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
      
      const parsed = JSON.parse(content);
      res.json({ success: true, ...parsed });
    } catch (err) {
      console.error('DeepSeek Error:', err);
      res.status(500).json({ error: 'Failed to generate blanks' });
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
