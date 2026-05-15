require('dotenv').config();
const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS so frontend can talk to backend
app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static('public'));

// Set up file upload handling (stores in memory, not disk)
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Claude API
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Test endpoint to make sure server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

// Resume analysis endpoint
app.post('/api/analyze', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Convert uploaded file to text
    const resumeText = req.file.buffer.toString('utf-8');

    console.log('Analyzing resume...');

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4.5-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `You are an expert resume reviewer and ATS (Applicant Tracking System) specialist. 

Analyze this resume and provide:

1. ATS Compatibility Score (0-100) and explanation
2. Top 3-5 critical issues that would cause ATS rejection
3. 5-7 specific, actionable suggestions for improvement
4. 3-5 LinkedIn headline options based on this person's experience
5. Missing keywords or skills that should be added

Be direct, specific, and actionable. Focus on what will get them more interviews.

Resume:
${resumeText}`
        }
      ]
    });

    // Extract the analysis from Claude's response
    const analysis = message.content[0].text;

    res.json({
      success: true,
      analysis: analysis,
      resumePreview: resumeText.substring(0, 500) + '...'
    });

  } catch (error) {
    console.error('Error analyzing resume:', error);
    res.status(500).json({ 
      error: 'Failed to analyze resume',
      details: error.message 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📄 Open http://localhost:${PORT} in your browser`);
});