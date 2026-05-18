const Anthropic = require('@anthropic-ai/sdk');
const multer = require('multer');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const upload = multer({ storage: multer.memoryStorage() });

// Helper to parse multipart form data
function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const handler = upload.single('resume');
    handler(req, {}, (err) => {
      if (err) reject(err);
      else resolve(req.file);
    });
  });
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const file = await parseMultipartForm(req);
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const resumeText = file.buffer.toString('utf-8');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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

    const analysis = message.content[0].text;

    return res.status(200).json({
      success: true,
      analysis: analysis,
      resumePreview: resumeText.substring(0, 500) + '...'
    });

  } catch (error) {
    console.error('Error analyzing resume:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze resume',
      details: error.message 
    });
  }
};