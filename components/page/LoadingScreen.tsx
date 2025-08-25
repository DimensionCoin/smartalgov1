"use client";

const LoadingScreen = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-800 border-t-[#14f195] rounded-full animate-spin"></div>
        </div>
        <div className="text-white font-heading font-bold text-xl tracking-wider">
          SEEK
        </div>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    </div>
  );
};

export default LoadingScreen;
