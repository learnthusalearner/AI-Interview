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
  if (!sessionId) {
    throw new Error('Session ID is missing or invalid.');
  }
  const { data } = await apiClient.post('/interview/respond', { sessionId, text });
  return data.data; // expects { reply, cutoff }
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

export const sendProctoringFrameAPI = async (sessionId?: string | null, base64Frame?: string) => {
  const { data } = await apiClient.post('/interview/proctor/frame', { 
    sessionId: sessionId || undefined, 
    image: base64Frame 
  });
  return data.data;
};

export interface MLDetectionResponse {
  success: boolean;
  timestamp: number;
  processingTimeMs: number;
  faces: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  objects: Array<{
    class: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  error?: string;
}

export const detectMLFrameAPI = async (base64Image: string, signal?: AbortSignal): Promise<MLDetectionResponse> => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  const { data } = await axios.post<MLDetectionResponse>(
    `${baseURL}/ml/detect`, 
    { image: base64Image }, 
    { signal, timeout: 2500 }
  );
  return data;
};

export const checkMLHealthAPI = async (): Promise<{ status: string; faceModel: boolean; objectModel: boolean }> => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  const { data } = await axios.get(`${baseURL}/ml/health`, { timeout: 3000 });
  return data;
};

