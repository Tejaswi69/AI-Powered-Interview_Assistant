// AI Service for generating interview questions and scoring answers using Google Gemini
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const QUESTION_DIFFICULTIES = {
  easy: { count: 2, time: 20 },
  medium: { count: 2, time: 60 },
  hard: { count: 2, time: 120 }
};

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1000,
  }
});

// Google Gemini API call with retry logic
async function callGemini(prompt, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`Gemini API Error (attempt ${i + 1}/${retries}):`, error);

      // If it's a 503 (overloaded) or 429 (rate limit) and we have retries left
      if (i < retries - 1 && (error.message.includes('503') || error.message.includes('429') || error.message.includes('overloaded'))) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }

      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }
}

// Generate all 6 interview questions at once
export async function generateAllQuestions() {
  const fullPrompt = `You are an expert technical interviewer for a Full Stack Developer position (React/Node.js).

Generate EXACTLY 6 Multiple Choice Questions (MCQ) in this specific order:
- 2 EASY questions (fundamental concepts)
- 2 MEDIUM questions (practical implementation)
- 2 HARD questions (advanced problem-solving)

Each question must have:
- A clear question
- 4 options (A, B, C, D)
- One correct answer

CRITICAL: Return ONLY valid JSON array. No markdown, no code blocks, no explanation text.
Start your response with [ and end with ]. Nothing else.

Format:
[
  {
    "difficulty": "easy",
    "question": "What is the virtual DOM in React?",
    "options": {
      "A": "A copy of the real DOM stored in memory",
      "B": "A database for storing component state",
      "C": "A CSS framework for styling",
      "D": "A testing library"
    },
    "correctAnswer": "A"
  },
  {
    "difficulty": "easy",
    "question": "Which hook is used for side effects in React?",
    "options": {
      "A": "useState",
      "B": "useEffect",
      "C": "useContext",
      "D": "useReducer"
    },
    "correctAnswer": "B"
  },
  {
    "difficulty": "medium",
    "question": "What HTTP status code indicates successful resource creation?",
    "options": {
      "A": "200 OK",
      "B": "201 Created",
      "C": "204 No Content",
      "D": "301 Moved Permanently"
    },
    "correctAnswer": "B"
  },
  {
    "difficulty": "medium",
    "question": "In Node.js, which module is used for file operations?",
    "options": {
      "A": "http",
      "B": "path",
      "C": "fs",
      "D": "url"
    },
    "correctAnswer": "C"
  },
  {
    "difficulty": "hard",
    "question": "What is the time complexity of accessing an element in a hash table on average?",
    "options": {
      "A": "O(n)",
      "B": "O(log n)",
      "C": "O(1)",
      "D": "O(n^2)"
    },
    "correctAnswer": "C"
  },
  {
    "difficulty": "hard",
    "question": "Which pattern is best for managing complex state in React?",
    "options": {
      "A": "Singleton Pattern",
      "B": "Observer Pattern",
      "C": "Flux/Redux Pattern",
      "D": "Factory Pattern"
    },
    "correctAnswer": "C"
  }
]

Make questions specific, technical, and relevant to modern React and Node.js development.`;

  const response = await callGemini(fullPrompt);

  // Remove markdown code blocks if present
  let cleanedResponse = response.trim();
  cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // Parse JSON from response
  const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('AI Response:', response);
    throw new Error('Failed to parse questions from AI response');
  }

  const questions = JSON.parse(jsonMatch[0]);

  // Add time limits based on difficulty
  return questions.map(q => ({
    ...q,
    timeLimit: QUESTION_DIFFICULTIES[q.difficulty].time,
    score: null,
    answer: null,
    feedback: null
  }));
}

// Score a single MCQ answer
export async function scoreAnswer(questionObj, selectedAnswer, difficulty) {
  // For MCQ, check if answer is correct
  if (!selectedAnswer || selectedAnswer.trim() === '') {
    return {
      score: 0,
      feedback: 'No answer provided (time expired).'
    };
  }

  const isCorrect = selectedAnswer.trim().toUpperCase() === questionObj.correctAnswer.toUpperCase();

  if (isCorrect) {
    return {
      score: 10,
      feedback: `Correct! The answer is ${questionObj.correctAnswer}: ${questionObj.options[questionObj.correctAnswer]}`
    };
  } else {
    return {
      score: 0,
      feedback: `Incorrect. You selected ${selectedAnswer}: ${questionObj.options[selectedAnswer] || 'Invalid option'}. The correct answer is ${questionObj.correctAnswer}: ${questionObj.options[questionObj.correctAnswer]}`
    };
  }
}

// Generate final summary and total score
export async function generateFinalSummary(questions) {
  const totalScore = questions.reduce((sum, q) => sum + (q.score || 0), 0);
  const maxScore = questions.length * 10;
  const percentage = ((totalScore / maxScore) * 100).toFixed(1);

  const systemPrompt = `You are an expert technical interviewer providing a final evaluation summary.
Based on the candidate's performance across all questions, provide:
1. Overall assessment (2-3 sentences)
2. Key strengths
3. Areas for improvement

Keep it professional, constructive, and concise.`;

  const questionsText = questions.map((q, i) =>
    `Q${i + 1} (${q.difficulty}): ${q.question}
Answer: ${q.answer || 'No answer'}
Score: ${q.score}/10
Feedback: ${q.feedback}`
  ).join('\n\n');

  const userPrompt = `Candidate Performance Summary:
Total Score: ${totalScore}/${maxScore} (${percentage}%)

${questionsText}

Provide a final evaluation summary.`;

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const summary = await callGemini(fullPrompt);

  return {
    totalScore,
    maxScore,
    percentage,
    summary
  };
}
