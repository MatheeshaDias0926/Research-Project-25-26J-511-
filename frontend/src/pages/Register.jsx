import { useState } from "react";
import { Link } from "react-router-dom";
import { Bus, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Register.css";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    role: "passenger",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setIsLoading(true);
    await register(formData.username, formData.password, formData.role);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-secondary py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl animate-pulse-custom"></div>
        <div
          className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl animate-pulse-custom"
          style={{ animationDelay: "1.5s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl animate-pulse-custom"
          style={{ animationDelay: "0.75s" }}
        ></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header Section */}
        <div className="text-center animate-fadeIn">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-xl"></div>
              <div className="relative bg-white rounded-2xl p-4 shadow-2xl transform hover:scale-110 transition-transform duration-300">
                <Bus className="h-14 w-14 text-purple-600" />
              </div>
            </div>
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg">
            Create Your Account
          </h2>
          <p className="text-lg text-white text-opacity-90 font-medium">
            Join the Smart Bus Safety System
          </p>
        </div>

        {/* Registration Form */}
        <form
          className="mt-8 space-y-5 glass-effect p-8 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn"
          onSubmit={handleSubmit}
          style={{ animationDelay: "0.1s" }}
        >
          <div className="space-y-4">
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
                value={formData.username}
                onChange={handleChange}
                className="input-field shadow-sm hover:shadow-md transition-shadow duration-200"
                placeholder="Choose a username"
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
                value={formData.password}
                onChange={handleChange}
                className="input-field shadow-sm hover:shadow-md transition-shadow duration-200"
                placeholder="Create a secure password"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input-field shadow-sm hover:shadow-md transition-shadow duration-200"
                placeholder="Confirm your password"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                I am a...
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input-field shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
              >
                <option value="passenger">🚶 Passenger</option>
                <option value="conductor">👨‍✈️ Bus Conductor</option>
                <option value="authority">👮 Transport Authority</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 btn-primary text-lg py-3.5 shadow-xl hover:shadow-2xl mt-6"
          >
            {isLoading ? (
              <>
                <div className="spinner h-5 w-5"></div>
                <span className="animate-pulse-custom">
                  Creating account...
                </span>
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Create Account
              </>
            )}
          </button>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 rounded-full">
                Already registered?
              </span>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200 group"
            >
              Sign in to your account
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
          <p>✓ Free to join • ✓ Instant access • ✓ Real-time updates</p>
        </div>
      </div>
    </div>
  );
}
