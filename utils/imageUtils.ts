/**
 * Resizes an image to a maximum dimension while maintaining aspect ratio.
 * This helps reduce payload size for the API.
 */
export const resizeImage = async (file: File, maxDimension: number = 1024): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64
      const mimeType = 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, 0.9);
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType });
    };

    img.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Removes a specific background color (default white) from an image data URL
 * and returns a new data URL (PNG) with transparency.
 */
export const removeBackground = (dataUrl: string, tolerance: number = 30): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = dataUrl;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Target color to remove (White)
      const targetR = 255;
      const targetG = 255;
      const targetB = 255;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate distance from white
        const diff = Math.sqrt(
          Math.pow(r - targetR, 2) +
          Math.pow(g - targetG, 2) +
          Math.pow(b - targetB, 2)
        );

        if (diff < tolerance) {
          data[i + 3] = 0; // Set alpha to 0
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = reject;
  });
};
