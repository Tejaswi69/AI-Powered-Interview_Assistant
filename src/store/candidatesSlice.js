import { createSlice, nanoid } from '@reduxjs/toolkit';

const initialState = {
    byId: {},
    allIds: [],
    currentCandidateId: null // Track active interview session
};

const candidatesSlice = createSlice({
    name: 'candidates',
    initialState,
    reducers: {
        addCandidate: {
            reducer(state, action) {
                const { id } = action.payload;
                state.byId[id] = action.payload;
                state.allIds.unshift(id);
                state.currentCandidateId = id;
            },
            prepare({ name, email, phone, resumeMeta }) {
                return {
                    payload: {
                        id: nanoid(),
                        name,
                        email,
                        phone,
                        resumeMeta,
                        status: 'collecting_info', // collecting_info, in_progress, paused, completed
                        createdAt: Date.now(),
                        currentQuestionIndex: 0,
                        questions: [],
                        answers: [],
                        chatHistory: [], // For displaying chat messages
                        finalScore: null,
                        finalSummary: null,
                        lastActiveAt: Date.now(),
                        remainingTime: null, // For timer persistence
                        collectingField: null // Track which field is being collected: 'name', 'email', 'phone', or null
                    }
                };
            }
        },

        updateCandidateFields(state, action) {
            const { id, name, email, phone } = action.payload;
            if (state.byId[id]) {
                if (name !== undefined) state.byId[id].name = name;
                if (email !== undefined) state.byId[id].email = email;
                if (phone !== undefined) state.byId[id].phone = phone;
                state.byId[id].lastActiveAt = Date.now();
            }
        },

        setCollectingField(state, action) {
            const { id, field } = action.payload;
            if (state.byId[id]) {
                state.byId[id].collectingField = field;
            }
        },

        setCurrentCandidate(state, action) {
            state.currentCandidateId = action.payload;
        },

        startInterview(state, action) {
            const { id, questions } = action.payload;
            if (state.byId[id]) {
                state.byId[id].status = 'in_progress';
                state.byId[id].questions = questions;
                state.byId[id].currentQuestionIndex = 0;
                state.byId[id].startedAt = Date.now();
                state.byId[id].lastActiveAt = Date.now();
            }
        },

        addChatMessage(state, action) {
            const { id, message } = action.payload;
            if (state.byId[id]) {
                state.byId[id].chatHistory.push({
                    ...message,
                    timestamp: Date.now()
                });
                state.byId[id].lastActiveAt = Date.now();
            }
        },

        submitAnswer(state, action) {
            const { id, questionIndex, answer, timeSpent } = action.payload;
            if (state.byId[id] && state.byId[id].questions[questionIndex]) {
                state.byId[id].questions[questionIndex].answer = answer;
                state.byId[id].questions[questionIndex].timeSpent = timeSpent;
                state.byId[id].lastActiveAt = Date.now();
            }
        },

        scoreQuestion(state, action) {
            const { id, questionIndex, score, feedback } = action.payload;
            if (state.byId[id] && state.byId[id].questions[questionIndex]) {
                state.byId[id].questions[questionIndex].score = score;
                state.byId[id].questions[questionIndex].feedback = feedback;
            }
        },

        nextQuestion(state, action) {
            const { id } = action.payload;
            if (state.byId[id]) {
                state.byId[id].currentQuestionIndex += 1;
                state.byId[id].lastActiveAt = Date.now();
            }
        },

        completeInterview(state, action) {
            const { id, finalScore, finalSummary } = action.payload;
            if (state.byId[id]) {
                state.byId[id].status = 'completed';
                state.byId[id].finalScore = finalScore;
                state.byId[id].finalSummary = finalSummary;
                state.byId[id].completedAt = Date.now();
                state.byId[id].lastActiveAt = Date.now();
            }
        },

        pauseInterview(state, action) {
            const { id, remainingTime } = action.payload;
            if (state.byId[id]) {
                state.byId[id].status = 'paused';
                state.byId[id].pausedAt = Date.now();
                if (remainingTime !== undefined) {
                    state.byId[id].remainingTime = remainingTime;
                }
            }
        },

        resumeInterview(state, action) {
            const { id } = action.payload;
            if (state.byId[id]) {
                state.byId[id].status = 'in_progress';
                state.byId[id].lastActiveAt = Date.now();
                // remainingTime will be read by InterviewChat to restore timer
            }
        },

        updateRemainingTime(state, action) {
            const { id, remainingTime } = action.payload;
            if (state.byId[id]) {
                state.byId[id].remainingTime = remainingTime;
            }
        },

        deleteCandidate(state, action) {
            const id = action.payload;
            delete state.byId[id];
            state.allIds = state.allIds.filter(cId => cId !== id);
            if (state.currentCandidateId === id) {
                state.currentCandidateId = null;
            }
        }
    }
});

export const {
    addCandidate,
    updateCandidateFields,
    setCollectingField,
    setCurrentCandidate,
    startInterview,
    addChatMessage,
    submitAnswer,
    scoreQuestion,
    nextQuestion,
    completeInterview,
    pauseInterview,
    resumeInterview,
    updateRemainingTime,
    deleteCandidate
} = candidatesSlice.actions;

export default candidatesSlice.reducer;
