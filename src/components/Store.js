import React, { useState, useRef, useCallback, useEffect } from "react";
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
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import cv from 'opencv-ts';

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
  const canvasRef = useRef(null); // Tạo ref cho canvas
  const navigate = useNavigate();

  // Helper function for notifications
  const showNotification = (message, type) => {
    toast[type](message);
  };

  // Capture video và upload lên Firebase
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

  // Tải file cascade XML cho nhận diện gương mặt với OpenCV.js
  useEffect(() => {
    const loadOpenCv = async () => {
      if (cv && cv.CascadeClassifier) {
        const faceCascade = new cv.CascadeClassifier();
    
        try {
          const xmlUrl = 'https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml';
          const response = await fetch(xmlUrl);
    
          if (!response.ok) {
            throw new Error("Unable to fetch the cascade file.");
          }
    
          const data = await response.text();
    
          // Tạo tệp trong hệ thống tệp ảo
          cv.FS_createDataFile("/", "haarcascade_frontalface_default.xml", data, true, false);
          faceCascade.load('haarcascade_frontalface_default.xml'); // Tải cascade nhận diện gương mặt
    
          // Kiểm tra video có sẵn trước khi phát hiện gương mặt
          const detectFace = () => {
            const video = webcamRef.current.video;
            if (video && video.videoWidth > 0 && video.videoHeight > 0) {
              detect(video, faceCascade);
            } else {
              setTimeout(detectFace, 100); // Chờ và kiểm tra lại
            }
          };
    
          detectFace(); // Bắt đầu quá trình phát hiện liên tục
        } catch (error) {
          console.error("Error loading OpenCV:", error);
          showNotification("Error loading OpenCV: " + error.message, "error");
        }
      }
    };
    
    loadOpenCv();
  }, []);

  // Hàm phát hiện gương mặt và vẽ khung xung quanh
  const detect = (video, faceCascade) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;  // Cập nhật kích thước canvas
    canvas.height = video.videoHeight;

    const detectLoop = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height); // Vẽ khung hình video lên canvas
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Lấy dữ liệu ảnh
      let src = cv.matFromImageData(imageData); // Chuyển ảnh từ canvas thành OpenCV Mat
      let gray = new cv.Mat();

      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // Chuyển thành ảnh grayscale

      let faces = new cv.RectVector();
      faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0); // Phát hiện gương mặt

      // Vẽ khung xung quanh gương mặt được phát hiện
      for (let i = 0; i < faces.size(); i++) {
        let face = faces.get(i);
        ctx.beginPath();
        ctx.rect(face.x, face.y, face.width, face.height); // Vẽ khung hình chữ nhật quanh gương mặt
        ctx.lineWidth = 2;
        ctx.strokeStyle = "red";
        ctx.stroke();
      }

      // Giải phóng bộ nhớ
      src.delete();
      gray.delete();
      faces.delete();

      // Lặp lại phát hiện gương mặt ở khung hình tiếp theo
      requestAnimationFrame(detectLoop);
    };

    detectLoop(); // Bắt đầu phát hiện gương mặt
  };

  // Hàm bắt đầu ghi hình và xử lý video
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setTimeout(() => {
      captureVideo(); // Sử dụng cùng hàm captureVideo
      setIsRecording(false);
    }, 3000);
  }, [captureVideo]);

  const handleRecordAndSubmit = async () => {
    startRecording();
    setTimeout(() => {
      if (isLogin) {
        handleLogin();
      } else {
        handleSignUp();
      }
    }, 3000);
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
          <div className="flex flex-col items-center mb-6 relative">
            <Webcam
              ref={webcamRef}
              audio={false}
              mirrored={true}
              className="w-full h-64 rounded-lg shadow-lg"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-64"
            />

            {isRecording && (
              <p className="text-blue-500 mt-2">Recording in progress...</p>
            )}
            {!isRecording && videoUploaded && (
              <p className="text-green-500 mt-2">Video uploaded successfully!</p>
            )}
          </div>

          <button
            onClick={handleRecordAndSubmit}
            className={`bg-${isLogin ? 'blue' : 'green'}-600 text-white rounded p-3 w-full hover:bg-${isLogin ? 'blue' : 'green'}-700 transition duration-300 ease-in-out`}
          >
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Login;
