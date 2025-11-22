import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Input, Button, Progress, Typography, Space, Tag, Spin, message, Radio } from 'antd';
import { ClockCircleOutlined, SendOutlined } from '@ant-design/icons';
import {
  addChatMessage,
  submitAnswer,
  scoreQuestion,
  nextQuestion,
  completeInterview,
  updateCandidateFields,
  setCollectingField,
  startInterview,
  updateRemainingTime,
  pauseInterview,
  deleteCandidate
} from '../../store/candidatesSlice';
import { scoreAnswer, generateFinalSummary, generateAllQuestions } from '../../services/aiService';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

export default function InterviewChat() {
  const dispatch = useDispatch();
  const currentCandidateId = useSelector(state => state.candidates.currentCandidateId);
  const candidate = useSelector(state =>
    currentCandidateId ? state.candidates.byId[currentCandidateId] : null
  );

  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isScoring, setIsScoring] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [addedQuestionIndex, setAddedQuestionIndex] = useState(-1);
  const chatEndRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  const isCollectingInfo = candidate?.status === 'collecting_info';
  const isInterviewing = candidate?.status === 'in_progress';
  const isCompleted = candidate?.status === 'completed';

  const currentQuestion = candidate?.questions?.[candidate.currentQuestionIndex];
  const isLastQuestion = candidate?.currentQuestionIndex === candidate?.questions?.length - 1;
  const totalQuestions = candidate?.questions?.length || 6;
  const progress = candidate ? ((candidate.currentQuestionIndex / totalQuestions) * 100) : 0;

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [candidate?.chatHistory]);

  // Initialize and run timer when question changes
  useEffect(() => {
    if (!candidate || !isInterviewing || !currentQuestion) {
      return;
    }

    // Initialize timer
    const initialTime = candidate.remainingTime !== null && candidate.remainingTime !== undefined
      ? candidate.remainingTime
      : currentQuestion.timeLimit;

    setTimeLeft(initialTime);
    startTimeRef.current = Date.now();

    // Clear persisted time after using it
    if (candidate.remainingTime !== null) {
      setTimeout(() => {
        dispatch(updateRemainingTime({ id: currentCandidateId, remainingTime: null }));
      }, 0);
    }

    // Start countdown
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;

        if (newTime <= 0) {
          clearInterval(timerRef.current);
          // Persist zero time
          dispatch(updateRemainingTime({ id: currentCandidateId, remainingTime: 0 }));
          // Trigger auto-submit after a small delay
          setTimeout(() => handleAutoSubmit(), 0);
          return 0;
        }

        // Persist remaining time every second
        dispatch(updateRemainingTime({ id: currentCandidateId, remainingTime: newTime }));
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [candidate?.currentQuestionIndex, isInterviewing]);

  // Add question to chat when it appears
  useEffect(() => {
    if (currentQuestion && candidate?.currentQuestionIndex !== addedQuestionIndex) {
      dispatch(addChatMessage({
        id: currentCandidateId,
        message: {
          type: 'question',
          content: currentQuestion.question,
          difficulty: currentQuestion.difficulty,
          timeLimit: currentQuestion.timeLimit,
          options: currentQuestion.options
        }
      }));
      setAddedQuestionIndex(candidate.currentQuestionIndex);
    }
  }, [currentQuestion, candidate?.currentQuestionIndex]);

  // Handle beforeunload to save state
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isInterviewing && timeLeft > 0) {
        dispatch(pauseInterview({
          id: currentCandidateId,
          remainingTime: timeLeft
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isInterviewing, timeLeft]);

  const handleFieldSubmit = async () => {
    const fieldValue = answer.trim();
    if (!fieldValue) {
      message.warning('Please provide a valid response');
      return;
    }

    const collectingField = candidate.collectingField;

    // Validate based on field type
    if (collectingField === 'email' && !/\S+@\S+\.\S+/.test(fieldValue)) {
      message.error('Please enter a valid email address');
      return;
    }

    if (collectingField === 'phone' && !/^[\d\s\-\+\(\)]{10,}$/.test(fieldValue)) {
      message.error('Please enter a valid phone number');
      return;
    }

    // Add user response to chat
    dispatch(addChatMessage({
      id: currentCandidateId,
      message: {
        type: 'user',
        content: fieldValue
      }
    }));

    // Update field
    dispatch(updateCandidateFields({
      id: currentCandidateId,
      [collectingField]: fieldValue
    }));

    setAnswer('');

    // Check what's next
    const updatedCandidate = { ...candidate, [collectingField]: fieldValue };
    const stillMissing = {
      name: !updatedCandidate.name,
      email: !updatedCandidate.email,
      phone: !updatedCandidate.phone
    };

    // Find next missing field
    let nextField = null;
    let promptMessage = '';

    if (stillMissing.name) {
      nextField = 'name';
      promptMessage = 'What is your full name?';
    } else if (stillMissing.email) {
      nextField = 'email';
      promptMessage = 'What is your email address?';
    } else if (stillMissing.phone) {
      nextField = 'phone';
      promptMessage = 'What is your phone number?';
    }

    if (nextField) {
      // Ask for next field
      setTimeout(() => {
        dispatch(setCollectingField({ id: currentCandidateId, field: nextField }));
        dispatch(addChatMessage({
          id: currentCandidateId,
          message: {
            type: 'bot',
            content: promptMessage
          }
        }));
      }, 500);
    } else {
      // All fields collected, start interview
      setTimeout(async () => {
        dispatch(addChatMessage({
          id: currentCandidateId,
          message: {
            type: 'bot',
            content: 'Perfect! Your profile is complete. Let\'s start the interview. I\'ll generate 6 technical questions for you.'
          }
        }));

        await startInterviewFlow();
      }, 500);
    }
  };

  const startInterviewFlow = async () => {
    setIsGenerating(true);

    try {
      message.loading({ content: 'Generating interview questions...', key: 'genQuestions' });

      const questions = await generateAllQuestions();

      message.success({ content: 'Questions generated! Starting interview...', key: 'genQuestions' });

      dispatch(startInterview({
        id: currentCandidateId,
        questions
      }));

    } catch (error) {
      console.error('Failed to generate questions:', error);
      message.error('Failed to generate questions. Please check your API configuration.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoSubmit = async () => {
    if (isScoring) return;
    await handleInterviewSubmit(true);
  };

  const handleInterviewSubmit = async (isAutoSubmit = false) => {
    if (isScoring) return;
    setIsScoring(true);

    const timeSpent = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : currentQuestion.timeLimit;

    const answerText = isAutoSubmit ? answer || '' : answer;

    // Add answer to chat
    dispatch(addChatMessage({
      id: currentCandidateId,
      message: {
        type: 'answer',
        content: answerText || '(No answer provided - time expired)',
        timeSpent
      }
    }));

    // Submit answer
    dispatch(submitAnswer({
      id: currentCandidateId,
      questionIndex: candidate.currentQuestionIndex,
      answer: answerText,
      timeSpent
    }));

    try {
      // Score MCQ answer
      const { score, feedback } = await scoreAnswer(
        currentQuestion,
        answerText,
        currentQuestion.difficulty
      );

      dispatch(scoreQuestion({
        id: currentCandidateId,
        questionIndex: candidate.currentQuestionIndex,
        score,
        feedback
      }));

      // Add feedback to chat
      dispatch(addChatMessage({
        id: currentCandidateId,
        message: {
          type: 'feedback',
          content: feedback,
          score
        }
      }));

      // Move to next question or complete interview
      if (isLastQuestion) {
        await handleCompleteInterview();
      } else {
        // Clear timer before moving to next question
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        dispatch(nextQuestion({ id: currentCandidateId }));
        setAnswer('');
        startTimeRef.current = null;

        // Reset remaining time in Redux to trigger fresh timer
        dispatch(updateRemainingTime({ id: currentCandidateId, remainingTime: null }));
      }
    } catch (error) {
      console.error('Scoring error:', error);
      message.error('Failed to score answer. Please check your API configuration.');
    } finally {
      setIsScoring(false);
    }
  };

  const handleCompleteInterview = async () => {
    try {
      const finalResult = await generateFinalSummary(candidate.questions);

      dispatch(completeInterview({
        id: currentCandidateId,
        finalScore: finalResult.totalScore,
        finalSummary: {
          ...finalResult,
          percentage: finalResult.percentage
        }
      }));

      // Add completion message to chat
      dispatch(addChatMessage({
        id: currentCandidateId,
        message: {
          type: 'completion',
          content: finalResult.summary,
          score: finalResult.totalScore,
          maxScore: finalResult.maxScore,
          percentage: finalResult.percentage
        }
      }));

      message.success('Interview completed! Check the Interviewer dashboard to see results.');
    } catch (error) {
      console.error('Final summary error:', error);
      message.error('Failed to generate final summary.');
    }
  };

  const handleSubmit = () => {
    if (isCollectingInfo) {
      handleFieldSubmit();
    } else if (isInterviewing) {
      handleInterviewSubmit(false);
    }
  };

  if (!candidate) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <Text>No active session. Please upload a resume to start.</Text>
      </div>
    );
  }

  const handleStartNewInterview = () => {
    dispatch(deleteCandidate(currentCandidateId));
    message.info('Session cleared. Please upload a new resume to start a new interview.');
  };

  if (isCompleted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <Space direction="vertical" size="large" style={{ width: '100%' }} className="text-center">
          <Title level={3} className="text-green-600">Interview Completed! 🎉</Title>
          <Text strong className="text-lg">Final Score: {candidate.finalScore}/{totalQuestions * 10}</Text>
          <Text>Thank you for participating. Check the Interviewer tab to see detailed results.</Text>
          <Button
            type="primary"
            size="large"
            onClick={handleStartNewInterview}
            className="mt-4"
          >
            Start New Interview
          </Button>
        </Space>
      </div>
    );
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'green';
      case 'medium': return 'orange';
      case 'hard': return 'red';
      default: return 'default';
    }
  };

  const getTimerColor = () => {
    if (!currentQuestion) return 'text-green-600';
    const percentage = (timeLeft / currentQuestion.timeLimit) * 100;
    if (percentage > 50) return 'text-green-600';
    if (percentage > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Progress Bar (only during interview) */}
      {isInterviewing && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div className="flex justify-between items-center">
              <Text strong>Progress</Text>
              <Text className="text-sm text-gray-600">Question {candidate.currentQuestionIndex + 1} of {totalQuestions}</Text>
            </div>
            <Progress percent={progress} status="active" />
          </Space>
        </div>
      )}

      {/* Chat History */}
      <div className="bg-gray-50 rounded-lg shadow-md p-4 h-96 overflow-y-auto">
        {candidate.chatHistory.map((msg, idx) => (
          <div key={idx} className="mb-4">
            {msg.type === 'system' && (
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                <Text strong>{msg.content}</Text>
              </div>
            )}

            {msg.type === 'bot' && (
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <Text strong className="text-blue-900">Bot:</Text>
                <p className="mt-1 text-gray-800">{msg.content}</p>
              </div>
            )}

            {msg.type === 'user' && (
              <div className="bg-gray-200 border-l-4 border-gray-500 rounded-lg p-4 ml-[20%]">
                <Text strong className="text-gray-900">You:</Text>
                <p className="mt-1 text-gray-800">{msg.content}</p>
              </div>
            )}

            {msg.type === 'question' && (
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <Space className="mb-2">
                  <Tag color={getDifficultyColor(msg.difficulty)}>
                    {msg.difficulty.toUpperCase()}
                  </Tag>
                  <Tag icon={<ClockCircleOutlined />}>{msg.timeLimit}s</Tag>
                </Space>
                <p className="text-gray-800 font-semibold mb-2">{msg.content}</p>
                {msg.options && (
                  <div className="mt-3 ml-4">
                    {Object.entries(msg.options).map(([key, value]) => (
                      <div key={key} className="text-gray-700 mb-1">
                        <Text strong>{key}:</Text> {value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {msg.type === 'answer' && (
              <div className="bg-white border-l-4 border-green-500 rounded-lg p-4 ml-[20%]">
                <Text strong>Your Answer:</Text>
                <p className="mt-1 text-gray-800">{msg.content}</p>
                <Text type="secondary" className="text-xs">
                  Time taken: {msg.timeSpent}s
                </Text>
              </div>
            )}

            {msg.type === 'feedback' && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
                <Space className="mb-2">
                  <Text strong>AI Feedback:</Text>
                  <Tag color={msg.score >= 7 ? 'green' : msg.score >= 5 ? 'orange' : 'red'}>
                    Score: {msg.score}/10
                  </Tag>
                </Space>
                <p className="text-gray-800">{msg.content}</p>
              </div>
            )}

            {msg.type === 'completion' && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6 text-center">
                <Title level={4} className="text-green-800">Interview Complete! 🎉</Title>
                <Text strong className="text-lg">
                  Final Score: {msg.score}/{msg.maxScore} ({msg.percentage}%)
                </Text>
                <p className="mt-2 text-gray-700">{msg.content}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      {(isCollectingInfo || isInterviewing) && !isGenerating && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Timer (only during interview) */}
            {isInterviewing && currentQuestion && (
              <div className="text-center">
                <Text strong className={`text-3xl ${getTimerColor()}`}>
                  <ClockCircleOutlined /> {timeLeft}s
                </Text>
              </div>
            )}

            {/* Input */}
            {isCollectingInfo ? (
              <Input
                placeholder="Type your response..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onPressEnter={handleSubmit}
                size="large"
                disabled={isScoring}
                className="w-full"
              />
            ) : isInterviewing && currentQuestion?.options ? (
              <Radio.Group
                onChange={(e) => setAnswer(e.target.value)}
                value={answer}
                disabled={isScoring}
                className="w-full"
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {Object.entries(currentQuestion.options).map(([key, value]) => (
                    <Radio
                      key={key}
                      value={key}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 transition-colors w-full"
                      style={{ marginLeft: 0, display: 'block' }}
                    >
                      <Text strong>{key}:</Text> {value}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            ) : null}

            {/* Submit Button */}
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              disabled={isScoring || !answer.trim()}
              loading={isScoring}
              block
              className="w-full"
            >
              {isScoring ? 'Processing...' : 'Submit'}
            </Button>
          </Space>
        </div>
      )}

      {(isScoring || isGenerating) && (
        <div className="text-center mt-4">
          <Spin tip={isGenerating ? 'Generating questions...' : 'AI is evaluating your answer...'} />
        </div>
      )}
    </div>
  );
}
