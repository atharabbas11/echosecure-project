import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import eslogo from '../images/eslogo.png';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { login, verifyOTP, isLoggingIn } = useAuthStore();
  const [otp, setOtp] = useState("");
  const [isOTPSent, setIsOTPSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOTPSent) {
      const { success } = await login(formData);
      // await login(formData);
      // setIsOTPSent(true);
      if (success) {
        setIsOTPSent(true);
      }
    } else {
      await verifyOTP({ email: formData.email, otp });
    }
  };

  return (
    <div className="h-screen flex items-center justify-center">
      {/* Left Side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 max-w-md mx-auto">
        <div className="w-full space-y-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <img src={eslogo} alt="EchoSecure Logo" className="mt-2 w-20 h-20 object-cover" />
              </div>
              <h1 className="text-3xl font-semibold mt-2">Secure Chat</h1>
              <p className="text-base-content/70">Government-grade security. Sign in to continue.</p>
            </div>
          </div>

          {/* Form */}
          {!isOTPSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Email</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-base-content/50" />
                  </div>
                  <input
                    type="email"
                    className={`input input-bordered w-full pl-10`}
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Password</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-base-content/50" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`input input-bordered w-full pl-10`}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-base-content/50" />
                    ) : (
                      <Eye className="h-5 w-5 text-base-content/50" />
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isLoggingIn}>
                {isLoggingIn ? (
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="ml-2">Loading...</span>
                  </div>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">OTP</span>
                </label>
                <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-base-content/50" />
                </div>
                <input
                  type={showOTP ? "text" : "password"}
                  placeholder="Enter OTP"
                  value={otp}
                  className={`input input-bordered w-full pl-10`}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowOTP(!showOTP)}
                >
                  {showOTP ? (
                    <EyeOff className="h-5 w-5 text-base-content/50" />
                  ) : (
                    <Eye className="h-5 w-5 text-base-content/50" />
                  )}
                </button>
                </div>
              </div>
              <button type="submit" onClick={handleSubmit} className="btn btn-primary w-full">
                <div className="flex justify-center items-center">
                  <button type="submit" onClick={handleSubmit}>Verify OTP</button>
                </div>
              </button>
            </div>
          )}    
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
