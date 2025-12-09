export interface ProcessedImage {
  id: string;
  originalUrl: string;
  processedUrl: string;
  prompt: string;
  timestamp: number;
}

export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'removing_background' | 'upscaling' | 'complete' | 'error';

export interface ImageDimensions {
  width: number;
  height: number;
}
