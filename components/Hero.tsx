import React from 'react';
import { Sparkles, Scissors } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <div className="bg-indigo-700 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-lg mb-8">
      <div className="max-w-7xl mx-auto text-center">
        <div className="flex justify-center items-center gap-3 mb-4">
          <Scissors className="h-10 w-10 text-indigo-300" />
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            ThreadGenie
          </h1>
          <Sparkles className="h-10 w-10 text-yellow-300" />
        </div>
        <p className="mt-3 max-w-md mx-auto text-base text-indigo-200 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Transform any image into a realistic embroidery patch with a transparent background. 
          Use AI to stitch your vision into reality.
        </p>
      </div>
    </div>
  );
};

export default Hero;
