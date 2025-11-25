"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function SignIn({ onToggleMode }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    // Clear submit error when user makes changes
    if (errors.submit) {
      setErrors((prev) => ({ ...prev, submit: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    const result = await signIn(formData);

    if (!result.success) {
      setErrors({ submit: result.message, errorType: result.errorType });
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-100 relative overflow-hidden">
      {/* Background Image with Blur Overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/ivma1.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Blur and Tint Overlay */}
        <div className="absolute inset-0  backdrop-blur-3xl bg-black/90"></div>

        {/* Gradient Accents */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 via-transparent to-green-500/20"></div>

        {/* Additional Blur Spots for Depth */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-30 blur-3xl bg-teal-600"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-30 blur-3xl bg-green-600"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl bg-teal-400"></div>
      </div>

      {/* Content */}
      <div className="flex w-screen flex-col justify-center px-12 relative z-10">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo Badge */}
          {/* <div className="flex justify-center mb-8">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/50">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden">
                <img
                  src="/ivma1.png"
                  alt="IVMA Logo"
                  className="object-contain w-full h-full"
                />
              </div>
            </div>
          </div> */}

          {/* Sign In Form - Card with Glass Effect */}
          <div className="  rounded-3xl   p-8">
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-white-900 mb-2">Welcome Back to Ivma</h1>
                <p className="text-white-600 text-sm">Sign in to continue to your dashboard</p>
              </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
                {errors.errorType === 'USER_NOT_FOUND' && (
                  <div className="mt-2">
                    <p className="text-gray-600 text-xs">
                      Don't have an account?{" "}
                      <button 
                        onClick={onToggleMode}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Create one here
                      </button>
                    </p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-white ${
                      errors.email ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  <div className="absolute right-3 top-3">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-white ${
                      errors.password ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  <div className="absolute right-3 top-3">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-white-700">
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-br from-green-950 via-gray-900 to-green-950 backdrop-blur-3xl text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

              <div className="text-center space-y-2">
                <p className="text-sm text-white-600">
                  Don't have an account?{" "}
                  <button
                    onClick={onToggleMode}
                    className="text-teal-600 font-medium hover:text-teal-700 hover:underline"
                  >
                    Sign up
                  </button>
                </p>
                <a href="#" className="text-sm text-white-600 hover:text-teal-600 hover:underline">
                  Forgot Password?
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
