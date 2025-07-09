import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Play, Square, Camera, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

interface PostureAnalysis {
  bad_posture: boolean;
  reason?: string;
  back_angle?: number;
  angle?: number;
  view_type?: string;
  analysis_method?: string;
  posture_status?: string;
}

function App() {
  const webcamRef = useRef<Webcam>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [postureData, setPostureData] = useState<PostureAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

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
          const result = await axios.post('http://localhost:8000/analyze/frame', formData, {
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

        {/* Main Content */}
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

          {/* Results Section */}
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

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Scanning Status</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                  }`}></div>
                  <span className="text-sm text-gray-600">
                    {isScanning ? 'Active - Scanning every second' : 'Inactive'}
                  </span>
                </div>
              </div>

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
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
        </div>
      </div>
    </div>
  );
}

export default App;