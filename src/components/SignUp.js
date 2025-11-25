"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import VerifyEmail from "./VerifyEmail";

export default function SignUp({ onToggleMode }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp } = useAuth();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const passwordChecks = [
    { label: "At least 8 characters", valid: formData.password.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(formData.password) },
    { label: "One lowercase letter", valid: /[a-z]/.test(formData.password) },
    { label: "One number", valid: /\d/.test(formData.password) },
    { label: "One special character", valid: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) }
  ];

  const isPasswordValid = passwordChecks.every(check => check.valid);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isPasswordValid) {
      newErrors.password = "Password does not meet all requirements";
    }
    
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the Terms of Service and Privacy Policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show verification page instead of signing up immediately
        setUserEmail(formData.email);
        setShowVerification(true);
      } else {
        setErrors({ submit: data.message });
      }
    } catch (error) {
      setErrors({ submit: "Network error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSuccess = (user) => {
    // User has been verified and logged in automatically
    // The AuthContext will handle the redirect to dashboard
  };

  const handleBackFromVerification = () => {
    setShowVerification(false);
    setUserEmail("");
  };

  // Show verification page if needed
  if (showVerification) {
    return (
      <VerifyEmail
        email={userEmail}
        onBack={handleBackFromVerification}
        onVerified={handleVerificationSuccess}
      />
    );
  }

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
        <div className="absolute inset-0 backdrop-blur-3xl bg-black/90"></div>

        {/* Gradient Accents */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 via-transparent to-green-500/20"></div>

        {/* Additional Blur Spots for Depth */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-30 blur-3xl bg-teal-600"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-30 blur-3xl bg-green-600"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl bg-teal-400"></div>
      </div>

      {/* Content */}
      <div className="flex w-screen flex-col justify-center px-12 py-12 relative z-10">
        <div className="mx-auto w-full max-w-sm">
          {/* Sign Up Form - No Card Background, Direct Text on Blur */}
          <div className="rounded-3xl p-8">
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Create Your Account</h1>
                <p className="text-white/80 text-sm">Join IVMA and start managing your inventory</p>
              </div>

              {errors.submit && (
                <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-xl p-3">
                  <p className="text-red-600 text-sm">{errors.submit}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* First Name and Last Name side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white bg-white/10 backdrop-blur-sm placeholder-white/50 ${
                        errors.firstName ? 'border-red-300' : 'border-white/20'
                      }`}
                    />
                    {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white bg-white/10 backdrop-blur-sm placeholder-white/50 ${
                        errors.lastName ? 'border-red-300' : 'border-white/20'
                      }`}
                    />
                    {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white bg-white/10 backdrop-blur-sm placeholder-white/50 ${
                        errors.email ? 'border-red-300' : 'border-white/20'
                      }`}
                    />
                    <div className="absolute right-3 top-3">
                      <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white bg-white/10 backdrop-blur-sm placeholder-white/50 ${
                        errors.password ? 'border-red-300' : 'border-white/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-3 text-white/50 hover:text-white/80"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                  
                  {/* Password Requirements */}
                  {formData.password && (
                    <div className="mt-3 space-y-2">
                      {passwordChecks.map((check, index) => (
                        <div key={index} className="flex items-center text-xs">
                          <div className={`w-2 h-2 rounded-full mr-2 ${check.valid ? 'bg-green-500' : 'bg-white/30'}`}></div>
                          <span className={check.valid ? 'text-green-400' : 'text-white/60'}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={handleChange}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-white/20 rounded bg-white/10"
                    />
                    <label className="ml-2 block text-sm text-white">
                      I agree to the Terms of Service and Privacy Policy
                    </label>
                  </div>
                  {errors.agreeToTerms && <p className="text-red-400 text-xs mt-1">{errors.agreeToTerms}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-br from-green-950 via-gray-900 to-green-950 backdrop-blur-3xl text-white py-3 px-4 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </>
                  ) : (
                    "Sign Up"
                  )}
                </button>
              </form>

              <div className="text-center">
                <p className="text-sm text-white/80">
                  Already have an account?{" "}
                  <button 
                    onClick={onToggleMode}
                    className="text-teal-400 font-medium hover:text-teal-300 hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
