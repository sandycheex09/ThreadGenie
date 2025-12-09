import React, { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, Wand2, ArrowRight, Trash2, Undo2, Scissors, Sparkles, MonitorUp } from 'lucide-react';
import Hero from './components/Hero';
import ImageUploader from './components/ImageUploader';
import LoadingOverlay from './components/LoadingOverlay';
import { generateEmbroidery, editImage, upscaleImage } from './services/geminiService';
import { resizeImage, removeBackground } from './utils/imageUtils';
import { ProcessingStatus } from './types';

// Fix: Use interface merging for AIStudio to avoid conflicting with existing global declarations
// The environment global types already define Window.aistudio as AIStudio
declare global {
  interface AIStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
  }
}

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null); // To show raw base64 from file input
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  // Refs for scrolling
  const resultRef = useRef<HTMLDivElement>(null);

  const handleImageSelect = async (file: File) => {
    try {
      setStatus('uploading');
      setError(null);
      const { base64, mimeType: resizedMime } = await resizeImage(file, 1024);
      const dataUrl = `data:${resizedMime};base64,${base64}`;
      
      setOriginalImage(base64);
      setPreviewImage(dataUrl);
      setCurrentImage(dataUrl);
      setMimeType(resizedMime);
      setHistory([dataUrl]);
      setStatus('idle');
    } catch (err) {
      setError('Failed to process image. Please try another file.');
      setStatus('error');
    }
  };

  const handleEmbroideryTransform = async () => {
    if (!currentImage || !originalImage) return;

    try {
      setStatus('processing');
      setError(null);
      
      // We always transform the CURRENT state of the image (allowing chained edits)
      // Extract base64 from current data URL
      const base64Input = currentImage.split(',')[1];
      
      // 1. Generate Embroidery
      const generatedBase64 = await generateEmbroidery(base64Input, mimeType);
      const generatedDataUrl = `data:image/jpeg;base64,${generatedBase64}`;
      
      setStatus('removing_background');
      
      // 2. Remove Background (Client-side)
      const transparentDataUrl = await removeBackground(generatedDataUrl);
      
      updateHistory(transparentDataUrl);
      setStatus('complete');
      
      // Scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err) {
      console.error(err);
      setError('Something went wrong during the transformation. Please try again.');
      setStatus('error');
    }
  };

  const handleMagicEdit = async () => {
    if (!currentImage || !editPrompt.trim()) return;

    try {
      setStatus('processing');
      setError(null);

      const base64Input = currentImage.split(',')[1];
      const generatedBase64 = await editImage(base64Input, mimeType, editPrompt);
      const generatedDataUrl = `data:image/jpeg;base64,${generatedBase64}`;
      
      updateHistory(generatedDataUrl);
      setStatus('complete');
      setEditPrompt('');

    } catch (err) {
      console.error(err);
      setError('Failed to edit image. The prompt might be against safety policies.');
      setStatus('error');
    }
  };

  const handleUpscale = async () => {
    if (!currentImage) return;

    // Check for API key before proceeding with Pro model features
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        // Assume key selection was successful and proceed
      }
    }

    try {
      setStatus('upscaling');
      setError(null);

      const base64Input = currentImage.split(',')[1];
      const upscaledBase64 = await upscaleImage(base64Input, mimeType);
      const upscaledDataUrl = `data:image/jpeg;base64,${upscaledBase64}`;

      // If the image was transparent (PNG), we might want to try and preserve that, 
      // but the model returns a new image. If the previous step was embroidery with removed background,
      // the upscale might add a background back.
      // Optimally, we re-run background removal if the previous image was transparent, 
      // but for now let's just output what the model gives us (usually high quality white/black background if not specified).
      // However, the upscale prompt asks to preserve content.
      
      // Let's attempt to remove background again if the result is intended to be a patch.
      // But 4K removal on client side might be heavy. Let's just return the upscaled image.
      // Users can re-edit if needed.
      
      updateHistory(upscaledDataUrl);
      setStatus('complete');

    } catch (err) {
      console.error(err);
      setError('Failed to upscale image. Ensure you have a valid API key selected for the Pro model.');
      setStatus('error');
    }
  };

  const updateHistory = (newImageUrl: string) => {
    setHistory(prev => [...prev, newImageUrl]);
    setCurrentImage(newImageUrl);
  };

  const handleUndo = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      setCurrentImage(newHistory[newHistory.length - 1]);
    }
  };

  const handleReset = () => {
    if (originalImage && mimeType) {
       const initialUrl = `data:${mimeType};base64,${originalImage}`;
       setHistory([initialUrl]);
       setCurrentImage(initialUrl);
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `thread-genie-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen pb-12">
      <Hero />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Input Section */}
        <div className="mb-12">
          {!currentImage ? (
            <div className="max-w-2xl mx-auto">
               <ImageUploader onImageSelected={handleImageSelect} disabled={status !== 'idle' && status !== 'error'} />
               {status === 'uploading' && (
                 <p className="text-center mt-4 text-slate-500 animate-pulse">Preparing your canvas...</p>
               )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Image Preview Area */}
              <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden min-h-[400px] border border-slate-100 group">
                 <LoadingOverlay status={status} />
                 
                 <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {history.length > 1 && (
                      <button 
                        onClick={handleUndo}
                        disabled={status !== 'idle' && status !== 'complete'}
                        className="p-2 bg-white/90 backdrop-blur text-slate-700 rounded-lg shadow hover:bg-white transition-all disabled:opacity-50"
                        title="Undo last change"
                      >
                        <Undo2 className="h-5 w-5" />
                      </button>
                    )}
                    <button 
                      onClick={handleReset}
                      disabled={history.length <= 1 || (status !== 'idle' && status !== 'complete')}
                      className="p-2 bg-white/90 backdrop-blur text-red-500 rounded-lg shadow hover:bg-white transition-all disabled:opacity-50"
                      title="Reset to original"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                 </div>

                 <div className="w-full h-full flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] bg-slate-50 p-4">
                    <img 
                      src={currentImage} 
                      alt="Current Work" 
                      className="max-h-[600px] w-auto object-contain drop-shadow-2xl rounded-lg"
                    />
                 </div>
              </div>

              {/* Controls Area */}
              <div className="flex flex-col gap-6" ref={resultRef}>
                
                {/* Main Action: Embroidery */}
                <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Scissors className="text-indigo-600 h-5 w-5" />
                    Embroidery Transformation
                  </h2>
                  <p className="text-slate-600 mb-4">
                    Convert the image into a realistic embroidery patch with a transparent background.
                  </p>
                  <button
                    onClick={handleEmbroideryTransform}
                    disabled={status !== 'idle' && status !== 'complete'}
                    className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transform transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                    {status === 'processing' || status === 'removing_background' ? (
                      <>Processing...</>
                    ) : (
                      <>
                        Make it Embroidery <Sparkles className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Secondary Action: Magic Edit */}
                <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Wand2 className="text-fuchsia-600 h-5 w-5" />
                    Magic Edit
                  </h2>
                  <p className="text-slate-600 mb-4">
                    Use text prompts to edit the image using Gemini 2.5 Flash.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="e.g., 'Add a retro filter'"
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent outline-none transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && handleMagicEdit()}
                      disabled={status !== 'idle' && status !== 'complete'}
                    />
                    <button
                      onClick={handleMagicEdit}
                      disabled={!editPrompt.trim() || (status !== 'idle' && status !== 'complete')}
                      className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Upscaler Action */}
                <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <MonitorUp className="text-emerald-600 h-5 w-5" />
                    4K Upscaler
                  </h2>
                  <p className="text-slate-600 mb-4">
                    Enhance resolution and clarity using the Gemini 3 Pro model.
                  </p>
                  <button
                    onClick={handleUpscale}
                    disabled={status !== 'idle' && status !== 'complete'}
                    className="w-full py-3 px-6 bg-white border-2 border-emerald-500 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'upscaling' ? 'Upscaling...' : 'Upscale to 4K'}
                    <Sparkles className="h-4 w-4" />
                  </button>
                </div>

                {/* Download Action */}
                <div className="mt-auto pt-4 border-t border-slate-200">
                   <button
                    onClick={handleDownload}
                    className="w-full py-3 px-6 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="h-5 w-5" />
                    Download Result
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 px-6 py-4 rounded-xl shadow-lg border border-red-100 flex items-center gap-3 animate-in slide-in-from-bottom-5">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-700 font-bold">✕</button>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;