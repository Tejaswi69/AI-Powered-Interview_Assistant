import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Upload, message, Spin } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import {
  extractTextFromPDF,
  extractTextFromDocx,
} from "../../utils/parseResume";
import {
  extractEmail,
  extractPhone,
  extractName,
} from "../../utils/extractFields";
import {
  addCandidate,
  updateCandidateFields,
  startInterview,
  resumeInterview,
  setCollectingField,
  addChatMessage,
  deleteCandidate
} from "../../store/candidatesSlice";
import { generateAllQuestions } from "../../services/aiService";
import MissingFieldsModal from "../MissingFieldsModal/MissingFieldsModal";
import WelcomeBackModal from "../WelcomeBackModal/WelcomeBackModal";
import InterviewChat from "../InterviewChat/InterviewChat";
import CandidateProfile from "../CandidateProfile/CandidateProfile";

export default function ResumeUpload() {
  const dispatch = useDispatch();
  const currentCandidateId = useSelector(state => state.candidates.currentCandidateId);
  const candidate = useSelector(state =>
    currentCandidateId ? state.candidates.byId[currentCandidateId] : null
  );

  const [showMissingFields, setShowMissingFields] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [missingFields, setMissingFields] = useState({});
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // Check for paused interview on mount
  useEffect(() => {
    if (candidate && (candidate.status === 'paused' || candidate.status === 'in_progress')) {
      setShowWelcomeBack(true);
    }
  }, [candidate]);

  const handleFile = async (file) => {
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      let text = "";

      if (ext === "pdf") text = await extractTextFromPDF(file);
      else if (ext === "docx") text = await extractTextFromDocx(file);
      else {
        message.error("Invalid file type. Please upload PDF or DOCX.");
        return false;
      }

      const email = extractEmail(text);
      const phone = extractPhone(text);
      const name = extractName(text, email);

      // Create candidate and get the action to access the generated ID
      const candidateAction = addCandidate({
        name,
        email,
        phone,
        resumeMeta: { name: file.name, size: file.size, type: file.type },
      });

      dispatch(candidateAction);
      const newCandidateId = candidateAction.payload.id;

      // Check for missing fields
      const missing = {
        name: !name,
        email: !email,
        phone: !phone
      };

      const hasMissingFields = missing.name || missing.email || missing.phone;

      if (hasMissingFields) {
        // Start conversational field collection via chat
        setMissingFields(missing);

        // Add welcome message to chat immediately
        // Use a small delay to ensure Redux state is updated
        setTimeout(() => {
          dispatch(addChatMessage({
            id: newCandidateId,
            message: {
              type: 'system',
              content: 'Welcome! I need a few more details before we begin the interview. Let\'s complete your profile.'
            }
          }));

          // Start collecting first missing field
          startFieldCollection(missing, newCandidateId);
        }, 100);
      } else {
        // All fields present, start interview directly
        await startInterviewFlow();
      }

      message.success("Resume uploaded and parsed successfully!");
    } catch (err) {
      console.error(err);
      message.error("Failed to parse resume. Please ensure the file is valid.");
    }
    return false; // prevent auto upload
  };

  const startFieldCollection = (missing) => {
    // Determine first missing field
    let firstField = null;
    let promptMessage = '';

    if (missing.name) {
      firstField = 'name';
      promptMessage = 'What is your full name?';
    } else if (missing.email) {
      firstField = 'email';
      promptMessage = 'What is your email address?';
    } else if (missing.phone) {
      firstField = 'phone';
      promptMessage = 'What is your phone number?';
    }

    if (firstField) {
      dispatch(setCollectingField({ id: currentCandidateId, field: firstField }));
      dispatch(addChatMessage({
        id: currentCandidateId,
        message: {
          type: 'bot',
          content: promptMessage
        }
      }));
    }
  };

  const handleMissingFieldsComplete = async (values) => {
    // Update candidate with missing fields
    dispatch(updateCandidateFields({
      id: currentCandidateId,
      ...values
    }));

    setShowMissingFields(false);

    // Start interview
    await startInterviewFlow();
  };

  const startInterviewFlow = async () => {
    setIsGeneratingQuestions(true);

    try {
      message.loading({ content: 'Generating interview questions...', key: 'genQuestions' });

      // Generate all questions using AI
      const questions = await generateAllQuestions();

      message.success({ content: 'Questions generated! Starting interview...', key: 'genQuestions' });

      // Start interview
      dispatch(startInterview({
        id: currentCandidateId,
        questions
      }));

    } catch (error) {
      console.error('Failed to generate questions:', error);
      message.error('Failed to generate questions. Please check your API configuration and try again.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleResumeInterview = () => {
    dispatch(resumeInterview({ id: currentCandidateId }));
    setShowWelcomeBack(false);
  };

  const handleStartOver = () => {
    // Delete current candidate and allow new upload
    dispatch(deleteCandidate(currentCandidateId));
    setShowWelcomeBack(false);
    message.info('Session cleared. Please upload a new resume to start over.');
  };

  // Show interview chat if interview is active or collecting info
  if (candidate && (candidate.status === 'in_progress' || candidate.status === 'completed' || candidate.status === 'collecting_info')) {
    return (
      <div>
        <CandidateProfile candidate={candidate} />
        <InterviewChat />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {isGeneratingQuestions ? (
        <div className="text-center py-10">
          <Spin size="large" tip="Generating personalized interview questions for you..." />
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">AI-Powered Interview Assistant</h2>
            <p className="text-gray-600 mt-2">Upload your resume (PDF or DOCX) to begin the interview process.</p>
          </div>

          <Upload beforeUpload={handleFile} showUploadList={false}>
            <Button icon={<UploadOutlined />} size="large" type="primary" className="shadow-md">
              Upload Resume (PDF/DOCX)
            </Button>
          </Upload>

          <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h4 className="font-semibold text-gray-800 mb-2">What to expect:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>6 technical questions (2 Easy, 2 Medium, 2 Hard)</li>
              <li>Timed responses: Easy 20s, Medium 60s, Hard 120s</li>
              <li>AI-powered evaluation and feedback</li>
              <li>Final score and performance summary</li>
            </ul>
          </div>
        </>
      )}

      {/* Modals */}
      <MissingFieldsModal
        visible={showMissingFields}
        missingFields={missingFields}
        onComplete={handleMissingFieldsComplete}
        candidateName={candidate?.name}
      />

      <WelcomeBackModal
        visible={showWelcomeBack}
        candidate={candidate}
        onResume={handleResumeInterview}
        onStartOver={handleStartOver}
      />
    </div>
  );
}
