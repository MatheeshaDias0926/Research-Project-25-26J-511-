export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-20 animate-pulse-custom"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-200 rounded-full blur-3xl opacity-20 animate-pulse-custom"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Loading Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Spinner */}
        <div className="relative">
          <div className="spinner h-20 w-20 border-4 border-gray-200"></div>
          <div className="absolute inset-0 spinner h-20 w-20 border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>

        {/* Message */}
        <p className="mt-6 text-gray-700 text-xl font-semibold animate-pulse-custom">
          {message}
        </p>

        {/* Loading Dots */}
        <div className="flex gap-2 mt-4">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    </div>
  );
}
