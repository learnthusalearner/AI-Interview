import axios from 'axios';

// Assuming the backend is running locally on 3000, 
import axiosRetry from 'axios-retry';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const apiClient = axios.create({
  baseURL: BASE_URL,
});

axiosRetry(apiClient, {
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 500;
  }
});

export const startInterviewAPI = async (candidateName: string, candidateEmail?: string) => {
  const { data } = await apiClient.post('/interview/start', { candidateName, candidateEmail });
  return data.data; // expects { sessionId, question }
};

export const respondInterviewAPI = async (sessionId: string, text: string) => {
  const { data } = await apiClient.post('/interview/respond', { sessionId, text });
  return data.data; // expects { reply }
};

export const evaluateInterviewAPI = async (sessionId: string, videoEngagementScore?: number, cheatFlags?: string[]) => {
  const { data } = await apiClient.post('/interview/evaluate', { sessionId, videoEngagementScore, cheatFlags });
  return data.data; 
};

export const transcribeAudioAPI = async (audioBlob: Blob) => {
  const formData = new FormData();
  // Provide a filename with an extension so multer handles it easily
  formData.append('audio', audioBlob, 'recording.webm');

  const { data } = await apiClient.post('/voice/input', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.transcript;
};

export const submitFeedbackAPI = async (sessionId: string, feedback: string) => {
  const { data } = await apiClient.post('/interview/feedback', { sessionId, feedback });
  return data.data;
};

export const getCandidateSessionsAPI = async (email: string) => {
  const { data } = await apiClient.get(`/interview/candidate/sessions/${encodeURIComponent(email)}`);
  return data.data;
};

export const updateApplicationStatusAPI = async (sessionId: string, status: 'ACCEPTED' | 'REJECTED', feedbackReason?: string) => {
  const { data } = await apiClient.post('/admin/status', { sessionId, status, feedbackReason });
  return data.data;
};

export const sendProctoringFrameAPI = async (sessionId: string, base64Frame: string) => {
  const { data } = await apiClient.post('/interview/proctor/frame', { sessionId, image: base64Frame });
  return data.data;
};
