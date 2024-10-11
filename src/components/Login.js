import { useState, useRef, useCallback } from "react"; // Removed useEffect
import { auth, googleProvider, storage } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { ref, uploadBytes } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { ToastContainer, toast } from 'react-toastify'; // Import ToastContainer và toast
import 'react-toastify/dist/ReactToastify.css'; 

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [notification, setNotification] = useState({ message: "", type: "" });
  const [isLogin, setIsLogin] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const webcamRef = useRef(null);
  const navigate = useNavigate();

  // Helper function for notifications
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification({ message: "", type: "" });
    }, 5000);
  };

  // Capture the video and upload to Firebase Storage
  const captureVideo = useCallback(() => {
    const videoStream = webcamRef.current.getCanvas();
    if (videoStream) {
      videoStream.toBlob(async (blob) => {
        const storageRef = ref(storage, `user-videos/${email}.mp4`);
        await uploadBytes(storageRef, blob);
        setVideoUploaded(true);
        showNotification("Video captured and uploaded successfully!", "success");
      }, "video/mp4");
    }
  }, [webcamRef, email]);

  // Start recording for 3 seconds
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setTimeout(() => {
      captureVideo();
      setIsRecording(false);
    }, 3000);
  }, [captureVideo]);

  // Function to handle video recording when logging in or signing up
  const handleRecordAndSubmit = async () => {
    startRecording(); // Start recording immediately
    // Wait for recording to finish, then log in or sign up
    setTimeout(() => {
      if (isLogin) {
        handleLogin();
      } else {
        handleSignUp();
      }
    }, 3000); // This should match the recording duration
  };

  // Handle login
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showNotification("Logged in successfully!", "success");
      navigate("/profile");
    } catch (error) {
      showNotification("Login failed: " + error.message, "error");
    }
  };

  // Handle signup
  const handleSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showNotification("Account created successfully!", "success");
      navigate("/profile");
    } catch (error) {
      showNotification("Sign up failed: " + error.message, "error");
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showNotification("Logged in with Google successfully!", "success");
      navigate("/profile");
    } catch (error) {
      showNotification("Google login failed: " + error.message, "error");
    }
  };

  // Handle password reset
  const handleForgotPasswordSubmit = async () => {
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      showNotification("Password reset email sent!", "success");
      setShowForgotPassword(false);
    } catch (error) {
      showNotification("Error: " + error.message, "error");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 to-purple-800 p-6">
      <div className="bg-white text-gray-800 p-8 rounded-lg shadow-lg w-full max-w-lg">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          {isLogin ? "Secure Login" : "Create Account"}
        </h1>

        {notification.message && (
          <div
            className={`p-4 mb-4 text-white text-center rounded ${
              notification.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {notification.message}
          </div>
        )}

        <div className="mb-6">
          <input
            type="email"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 p-3 border rounded w-full focus:ring focus:ring-purple-500 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 p-3 border rounded w-full focus:ring focus:ring-purple-500 focus:outline-none"
          />

          {/* Video Recording Section */}
          <div className="flex flex-col items-center mb-6">
            <Webcam
              ref={webcamRef}
              audio={false}
              mirrored={true}
              className="w-full h-64 rounded-lg shadow-lg"
            />
            {isRecording && (
              <p className="text-blue-500 mt-2">Recording in progress...</p>
            )}
            {!isRecording && videoUploaded && (
              <p className="text-green-500 mt-2">Video uploaded successfully!</p>
            )}
          </div>

          <button
            onClick={handleRecordAndSubmit} // Use the new function here
            className={`bg-${isLogin ? 'blue' : 'green'}-600 text-white rounded p-3 w-full hover:bg-${isLogin ? 'blue' : 'green'}-700 transition duration-300 ease-in-out`}
          >
            {isLogin ? "Login" : "Sign Up"}
          </button>

          <button
            onClick={handleGoogleLogin}
            className="bg-red-600 text-white rounded p-3 w-full hover:bg-red-700 mt-4 transition duration-300 ease-in-out"
          >
            {isLogin ? "Login with Google" : "Sign Up with Google"}
          </button>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 text-center w-full mt-4 hover:underline"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>

          {isLogin && (
            <button
              onClick={() => setShowForgotPassword(!showForgotPassword)}
              className="text-blue-600 text-center w-full mt-2 hover:underline"
            >
              Forgot Password?
            </button>
          )}

          {showForgotPassword && isLogin && (
            <div className="mt-4">
              <input
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="mb-3 p-3 border rounded w-full"
              />
              <button
                onClick={handleForgotPasswordSubmit}
                className="bg-purple-600 text-white rounded p-3 w-full hover:bg-purple-700 transition duration-300 ease-in-out"
              >
                Send Reset Email
              </button>
            </div>
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Login;
