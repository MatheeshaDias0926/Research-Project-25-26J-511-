import { useState } from "react";
import { Link } from "react-router-dom";
import { Bus, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await login(username, password);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-primary py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse-custom"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse-custom"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header Section */}
        <div className="text-center animate-fadeIn">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-xl"></div>
              <div className="relative bg-white rounded-2xl p-4 shadow-2xl transform hover:scale-110 transition-transform duration-300">
                <Bus className="h-14 w-14 text-blue-600" />
              </div>
            </div>
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg">
            Smart Bus Safety System
          </h2>
          <p className="text-lg text-white text-opacity-90 font-medium">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <form
          className="mt-8 space-y-6 glass-effect p-8 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn"
          onSubmit={handleSubmit}
          style={{ animationDelay: "0.1s" }}
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field shadow-sm hover:shadow-md transition-shadow duration-200"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field shadow-sm hover:shadow-md transition-shadow duration-200"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 btn-primary text-lg py-3.5 shadow-xl hover:shadow-2xl"
          >
            {isLoading ? (
              <>
                <div className="spinner h-5 w-5"></div>
                <span className="animate-pulse-custom">Signing in...</span>
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Sign In
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 rounded-full">
                New to Smart Bus?
              </span>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200 group"
            >
              Create an account
              <span className="transform group-hover:translate-x-1 transition-transform duration-200">
                →
              </span>
            </Link>
          </div>
        </form>

        {/* Footer Info */}
        <div
          className="text-center text-white text-opacity-80 text-sm animate-fadeIn"
          style={{ animationDelay: "0.2s" }}
        >
          <p>Secure • Reliable • Real-time Bus Tracking</p>
        </div>
      </div>
    </div>
  );
}
