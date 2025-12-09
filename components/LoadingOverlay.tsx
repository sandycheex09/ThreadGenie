import React from 'react';
import { Loader2 } from 'lucide-react';
import { ProcessingStatus } from '../types';

interface LoadingOverlayProps {
  status: ProcessingStatus;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ status }) => {
  if (status === 'idle' || status === 'complete' || status === 'error') return null;

  let message = 'Processing...';
  if (status === 'uploading') message = 'Preparing image...';
  if (status === 'processing') message = 'Stitching your design with Gemini...';
  if (status === 'removing_background') message = 'Removing background...';
  if (status === 'upscaling') message = 'Upscaling to 4K with Gemini Pro...';

  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-xl animate-in fade-in duration-200">
      <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
      <p className="text-lg font-semibold text-slate-700 animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingOverlay;
