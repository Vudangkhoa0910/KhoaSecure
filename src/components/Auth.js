// src/components/Auth.js
import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

const Auth = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (error) {
      console.error(error);
      alert("Đăng nhập thất bại!");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    onLogin();
  };

  return (
    <div>
      <h2>Đăng Nhập</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mật khẩu"
      />
      <button onClick={handleLogin}>Đăng Nhập</button>
      <button onClick={handleLogout}>Đăng Xuất</button>
    </div>
  );
};

export default Auth;
