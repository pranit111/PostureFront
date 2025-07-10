import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Play, Square, Camera, AlertTriangle, CheckCircle, Activity, Upload, Video, BarChart3 } from 'lucide-react';

interface PostureAnalysis {
  bad_posture: boolean;
  reason?: string;
  back_angle?: number;
  angle?: number;
  view_type?: string;
  analysis_method?: string;
  posture_status?: string;
}

interface FrameAnalysis {
  frame_number: number;
  timestamp: number;
  bad_posture: boolean;
  back_angle?: number;
  posture_status: string;
  activity_specific_issues: string[];
  suggestions: string[];
}

interface ActivityFeedback {
  activity: string;
  total_frames: number;
  poor_posture_frames: number;
  common_issues: string[];
  improvement_suggestions: string[];
  specific_metrics: { [key: string]: number };
}

interface VideoAnalysisResponse {
  activity_detected: string;
  overall_posture_score: number;
  frame_analyses: FrameAnalysis[];
  activity_specific_feedback: ActivityFeedback;
  summary: { [key: string]: any };
  processing_time: number;
  total_frames: number;
  analyzed_frames: number;
}

function App() {
  const webcamRef = useRef<Webcam>(null);
  const intervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [postureData, setPostureData] = useState<PostureAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  
  // Video analysis state
  const [videoAnalysisData, setVideoAnalysisData] = useState<VideoAnalysisResponse | null>(null);
  const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'video'>('live');

  const captureFrame = useCallback(async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setIsLoading(true);
        try {
          // Convert base64 to blob directly
          const base64Data = imageSrc.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });
          
          // Create FormData
          const formData = new FormData();
          formData.append('file', blob, 'frame.jpg');
          
          // Send to backend
          const result = await axios.post('https://posturebackend.onrender.com/analyze/frame', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 5000,
          });
          
          setPostureData(result.data);
          setConnectionStatus('connected');
          setLastUpdateTime(new Date().toLocaleTimeString());
        } catch (error) {
          console.error('Error analyzing frame:', error);
          setConnectionStatus('error');
        } finally {
          setIsLoading(false);
        }
      }
    }
  }, []);

  const handleVideoFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid video file (MP4, AVI, or MOV)');
        return;
      }
      
      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        alert('Video file is too large. Maximum size is 50MB.');
        return;
      }
      
      setSelectedVideoFile(file);
    }
  }, []);

  const analyzeVideo = useCallback(async () => {
    if (!selectedVideoFile) {
      alert('Please select a video file first');
      return;
    }

    setIsVideoAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedVideoFile);

      const result = await axios.post('https://posturebackend.onrender.com/analyze/video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds timeout for video processing
      });

      setVideoAnalysisData(result.data);
      setActiveTab('video'); // Switch to video results tab
    } catch (error) {
      console.error('Error analyzing video:', error);
      alert('Error analyzing video. Please try again with a smaller file or check your connection.');
    } finally {
      setIsVideoAnalyzing(false);
    }
  }, [selectedVideoFile]);

  const startScanning = useCallback(() => {
    setIsScanning(true);
    setConnectionStatus('connected');
    // Capture first frame immediately
    captureFrame();
    // Then capture every second
    intervalRef.current = setInterval(captureFrame, 1000);
  }, [captureFrame]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setConnectionStatus('disconnected');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getStatusIcon = () => {
    if (isLoading) return <Activity className="w-5 h-5 animate-spin" />;
    if (!postureData) return <Camera className="w-5 h-5" />;
    
    // Enhanced status based on posture_status
    if (postureData.posture_status === 'excellent') return <CheckCircle className="w-5 h-5" />;
    if (postureData.posture_status === 'good') return <CheckCircle className="w-5 h-5" />;
    if (postureData.posture_status === 'fair') return <AlertTriangle className="w-5 h-5" />;
    if (postureData.bad_posture) return <AlertTriangle className="w-5 h-5" />;
    
    return <CheckCircle className="w-5 h-5" />;
  };

  const getStatusColor = () => {
    if (isLoading) return 'text-blue-500';
    if (!postureData) return 'text-gray-500';
    
    // Enhanced colors based on posture_status
    if (postureData.posture_status === 'excellent') return 'text-green-600';
    if (postureData.posture_status === 'good') return 'text-green-500';
    if (postureData.posture_status === 'fair') return 'text-yellow-500';
    if (postureData.posture_status === 'poor') return 'text-orange-500';
    if (postureData.posture_status === 'bad') return 'text-red-500';
    if (postureData.posture_status === 'very_bad') return 'text-red-600';
    
    // Fallback to original logic
    if (postureData.bad_posture) return 'text-red-500';
    return 'text-green-500';
  };

  const getStatusBgColor = () => {
    if (isLoading) return 'bg-blue-50 border-blue-200';
    if (!postureData) return 'bg-gray-50 border-gray-200';
    
    // Enhanced background colors based on posture_status
    if (postureData.posture_status === 'excellent') return 'bg-green-50 border-green-200';
    if (postureData.posture_status === 'good') return 'bg-green-50 border-green-200';
    if (postureData.posture_status === 'fair') return 'bg-yellow-50 border-yellow-200';
    if (postureData.posture_status === 'poor') return 'bg-orange-50 border-orange-200';
    if (postureData.posture_status === 'bad') return 'bg-red-50 border-red-200';
    if (postureData.posture_status === 'very_bad') return 'bg-red-100 border-red-300';
    
    // Fallback to original logic
    if (postureData.bad_posture) return 'bg-red-50 border-red-200';
    return 'bg-green-50 border-green-200';
  };

  const getStatusMessage = () => {
    if (isLoading) return 'Analyzing...';
    if (!postureData) return 'Waiting for scan...';
    
    // Enhanced messages based on posture_status
    if (postureData.posture_status === 'excellent') return 'Excellent posture! ';
    if (postureData.posture_status === 'good') return 'Good posture ✅';
    if (postureData.posture_status === 'fair') return 'Fair posture ⚠️';
    if (postureData.posture_status === 'poor') return 'Poor posture detected ❌';
    if (postureData.posture_status === 'bad') return 'Bad posture - needs attention 🔴';
    if (postureData.posture_status === 'very_bad') return 'Very bad posture - urgent correction needed 🚨';
    if (postureData.posture_status === 'no_detection') return 'No pose detected 📷';
    if (postureData.posture_status === 'error') return 'Analysis error ⚠️';
    
    // Fallback to original logic
    if (postureData.bad_posture) return 'Bad posture detected';
    return 'Good posture';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Posture Scanner</h1>
          <p className="text-gray-600 text-lg">Real-time posture analysis for better health</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg p-1 shadow-md">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                activeTab === 'live'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Camera className="w-4 h-4 inline mr-2" />
              Live Analysis
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                activeTab === 'video'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Video className="w-4 h-4 inline mr-2" />
              Video Analysis
            </button>
          </div>
        </div>

        {/* Live Analysis Tab */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Webcam Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Live Camera Feed</h2>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
                  connectionStatus === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'error' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}></div>
                  {connectionStatus === 'connected' ? 'Connected' :
                   connectionStatus === 'error' ? 'Error' : 'Disconnected'}
                </div>
              </div>
              
              <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-video">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  mirrored={true}
                />
                {isLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 animate-spin text-blue-500" />
                      <span className="text-sm font-medium">Analyzing...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={startScanning}
                  disabled={isScanning}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    isScanning 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  <Play className="w-5 h-5" />
                  Start Scanning
                </button>
                <button
                  onClick={stopScanning}
                  disabled={!isScanning}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    !isScanning 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  <Square className="w-5 h-5" />
                  Stop Scanning
                </button>
              </div>
            </div>

            {/* Live Results Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Posture Analysis</h2>
                {lastUpdateTime && (
                  <span className="text-sm text-gray-500">Last update: {lastUpdateTime}</span>
                )}
              </div>

              {/* Status Card */}
              <div className={`rounded-lg border-2 p-6 mb-4 transition-all ${getStatusBgColor()}`}>
                <div className={`flex items-center gap-3 mb-3 ${getStatusColor()}`}>
                  {getStatusIcon()}
                  <span className="text-lg font-semibold">
                    {getStatusMessage()}
                  </span>
                </div>
                
                {postureData && postureData.bad_posture && postureData.reason && (
                  <p className="text-red-600 text-sm mb-2">
                    <strong>Reason:</strong> {postureData.reason}
                  </p>
                )}
                
                {postureData && postureData.back_angle && (
                  <div className="text-gray-700 text-sm mb-2">
                    <strong>Back Angle:</strong> {postureData.back_angle}°
                    {postureData.view_type && (
                      <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                        {postureData.view_type.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </div>
                )}

                {postureData && postureData.analysis_method && (
                  <div className="text-gray-600 text-xs">
                    <strong>Analysis Method:</strong> {postureData.analysis_method.replace('_', ' ')}
                  </div>
                )}
              </div>

              {/* Live Analysis Tips */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Tips for Better Posture</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {postureData?.view_type === 'front' ? (
                    <>
                      <li>• Keep your shoulders level and relaxed</li>
                      <li>• Center your head over your shoulders</li>
                      <li>• Avoid tilting your head to one side</li>
                      <li>• Maintain equal weight on both feet</li>
                    </>
                  ) : (
                    <>
                      <li>• Keep your back straight and shoulders back</li>
                      <li>• Avoid leaning forward or slouching</li>
                      <li>• Position your screen at eye level</li>
                      <li>• Take regular breaks to stretch and move</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Video Analysis Tab */}
        {activeTab === 'video' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Upload Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Video Upload & Analysis</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/avi,video/mov,video/quicktime"
                  onChange={handleVideoFileSelect}
                  className="hidden"
                />
                
                {selectedVideoFile ? (
                  <div className="space-y-3">
                    <Video className="w-12 h-12 text-blue-500 mx-auto" />
                    <div>
                      <p className="font-medium text-gray-800">{selectedVideoFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedVideoFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                    >
                      Change file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-gray-600 mb-2">Select a video file to analyze</p>
                      <p className="text-sm text-gray-500">Supported: MP4, AVI, MOV (max 50MB)</p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Choose Video File
                    </button>
                  </div>
                )}
              </div>

              {selectedVideoFile && (
                <button
                  onClick={analyzeVideo}
                  disabled={isVideoAnalyzing}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    isVideoAnalyzing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  {isVideoAnalyzing ? (
                    <>
                      <Activity className="w-5 h-5 animate-spin" />
                      Analyzing Video...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-5 h-5" />
                      Analyze Video
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Video Analysis Results */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Analysis Results</h2>
              
              {isVideoAnalyzing && (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600">Analyzing video... This may take a few moments.</p>
                </div>
              )}

              {videoAnalysisData ? (
                <div className="space-y-4">
                  {/* Overall Score */}
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-800">Overall Posture Score</h3>
                      <span className={`text-2xl font-bold ${
                        videoAnalysisData.overall_posture_score >= 80 ? 'text-green-600' :
                        videoAnalysisData.overall_posture_score >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {videoAnalysisData.overall_posture_score}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          videoAnalysisData.overall_posture_score >= 80 ? 'bg-green-500' :
                          videoAnalysisData.overall_posture_score >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${videoAnalysisData.overall_posture_score}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Activity Detected */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-2">Activity Detected</h3>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {videoAnalysisData.activity_detected.charAt(0).toUpperCase() + 
                         videoAnalysisData.activity_detected.slice(1)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {videoAnalysisData.analyzed_frames} of {videoAnalysisData.total_frames} frames analyzed
                      </span>
                    </div>
                  </div>

                  {/* Common Issues */}
                  {videoAnalysisData.activity_specific_feedback.common_issues.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <h3 className="font-medium text-red-800 mb-2">Common Issues Found</h3>
                      <ul className="text-sm text-red-700 space-y-1">
                        {videoAnalysisData.activity_specific_feedback.common_issues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvement Suggestions */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-medium text-green-800 mb-2">Improvement Suggestions</h3>
                    <ul className="text-sm text-green-700 space-y-1">
                      {videoAnalysisData.activity_specific_feedback.improvement_suggestions.map((suggestion, index) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Summary */}
                  {videoAnalysisData.summary.overall_rating && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-medium text-blue-800 mb-2">Overall Assessment</h3>
                      <p className="text-sm text-blue-700 mb-2">
                        <strong>Rating:</strong> {videoAnalysisData.summary.overall_rating}
                      </p>
                      {videoAnalysisData.summary.recommendation && (
                        <p className="text-sm text-blue-700">
                          <strong>Recommendation:</strong> {videoAnalysisData.summary.recommendation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Upload and analyze a video to see detailed results here.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Posture Scanner - Helping you maintain better posture for improved health</p>
        </div>
      </div>
    </div>
  );
}

export default App;