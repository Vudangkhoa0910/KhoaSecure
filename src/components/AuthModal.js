// src/components/AuthModal.js
import React, { useState } from "react";
import { auth } from "../firebase"; // Import Firebase Auth
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const AuthModal = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async () => {
    try {
      if (isSignup) {
        // Đăng ký logic
        await createUserWithEmailAndPassword(auth, username, password);
      } else {
        // Đăng nhập logic
        await signInWithEmailAndPassword(auth, username, password);
      }
      onClose();
    } catch (error) {
      setError("Tài khoản đã tồn tại hoặc thông tin không hợp lệ.");
    }
  };

  return isOpen ? (
    <div className="modal">
      <h2>{isSignup ? "Đăng Ký" : "Đăng Nhập"}</h2>
      <input
        type="text"
        placeholder="Tên đăng nhập"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Mật khẩu"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {isSignup && (
        <input
          type="password"
          placeholder="Xác nhận mật khẩu"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      )}
      <button onClick={handleAuth}>{isSignup ? "Đăng Ký" : "Đăng Nhập"}</button>
      {error && <p>{error}</p>}
      <button onClick={() => setIsSignup(!isSignup)}>
        {isSignup ? "Chuyển sang Đăng Nhập" : "Chuyển sang Đăng Ký"}
      </button>
      <button onClick={onClose}>Đóng</button>
    </div>
  ) : null;
};

export default AuthModal;
