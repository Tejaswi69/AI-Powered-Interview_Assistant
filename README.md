# AI-Powered Interview Assistant

An intelligent interview management system that automates the interview process using AI. The application allows candidates to upload their resumes, extracts key information, and conducts AI-generated technical interviews with automated scoring and feedback.

## Features

### For Candidates (Interviewee)
- **Resume Upload**: Upload PDF or DOCX resumes
- **Resume Parsing**: Automatic extraction of candidate information (name, email, skills, experience, etc.)
- **AI-Generated Questions**: Dynamic interview questions generated using Google Gemini AI
- **Timed MCQ Interviews**: 
  - 2 Easy questions (20 seconds each)
  - 2 Medium questions (60 seconds each)
  - 2 Hard questions (120 seconds each)
- **Real-time Feedback**: Immediate scoring and feedback after each question
- **Final Summary**: Comprehensive performance evaluation with strengths and areas for improvement

### For Interviewers
- **Candidate Dashboard**: View all candidates and their interview results
- **Search & Filter**: Search by name, filter by status (completed/in-progress)
- **Sorting Options**: Sort by score, date, or name
- **Detailed View**: View complete candidate profiles, interview responses, and scores
- **Data Management**: Delete candidate records as needed

## Tech Stack

- **Frontend Framework**: React 19 with Vite
- **State Management**: Redux Toolkit with Redux Persist
- **UI Library**: Ant Design
- **Styling**: Tailwind CSS
- **AI Integration**: Google Generative AI (Gemini 2.5 Flash)
- **Resume Parsing**: 
  - PDF.js for PDF files
  - Mammoth for DOCX files
- **Storage**: LocalForage for persistent local storage

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google Gemini API Key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-interview-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173` (or the port shown in the terminal)

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check for code issues

## Project Structure

```
ai-interview-assistant/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── CandidateProfile/
│   │   ├── InterviewChat/
│   │   ├── InterviewerDashboard/
│   │   ├── MissingFieldsModal/
│   │   ├── ResumeUpload/
│   │   └── WelcomeBackModal/
│   ├── services/        # API services
│   │   └── aiService.js # Google Gemini AI integration
│   ├── store/           # Redux store and slices
│   │   ├── candidatesSlice.js
│   │   └── index.js
│   ├── utils/           # Utility functions
│   │   ├── extractFields.js
│   │   ├── parseResume.js
│   │   └── pdfWorkerConfig.js
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global styles
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## Usage

### As a Candidate

1. Navigate to the **Interviewee** tab
2. Upload your resume (PDF or DOCX format)
3. Review and complete any missing profile information if prompted
4. Start the interview when ready
5. Answer each question within the time limit
6. Review your scores and feedback after completing all questions

### As an Interviewer

1. Navigate to the **Interviewer** tab
2. View the list of all candidates
3. Use the search bar to find specific candidates
4. Filter by status or sort by score/date/name
5. Click the eye icon to view detailed candidate information
6. Review interview responses, scores, and AI-generated feedback

## Configuration

### Google Gemini API

The application uses Google Gemini 2.5 Flash model for generating interview questions and providing feedback. Make sure to:

1. Obtain an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env` file as `VITE_GEMINI_API_KEY`
3. The API includes retry logic with exponential backoff for handling rate limits

### Interview Questions

The system generates 6 multiple-choice questions:
- **Easy**: Fundamental concepts (20 seconds each)
- **Medium**: Practical implementation (60 seconds each)
- **Hard**: Advanced problem-solving (120 seconds each)

Questions are focused on Full Stack Development (React/Node.js) and are generated dynamically for each interview session.

## Data Persistence

Candidate data and interview results are stored locally using:
- **Redux Persist**: Persists Redux state to localStorage
- **LocalForage**: Provides async storage with better performance than localStorage

Note: Data is cleared on application mount for a fresh start. Modify `src/App.jsx` if you want to preserve data across sessions.

## Browser Support

- Chrome (recommended)
- Firefox
- Edge
- Safari

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.

## Support

For issues or questions, please open an issue in the repository or contact the development team.

