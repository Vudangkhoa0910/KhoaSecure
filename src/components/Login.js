import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase"; // Cấu hình Firebase

const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); // Xóa lỗi trước đó nếu có
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Khi đăng nhập thành công, gọi hàm onLoginSuccess
      onLoginSuccess();
    } catch (error) {
      setError("Login failed. Please check your email and password.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 to-blue-800 text-white p-6">
      <h1 className="text-5xl font-extrabold mb-8">Login</h1>
      <div className="bg-white text-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <form onSubmit={handleLogin} className="flex flex-col">
          <label className="mb-2 font-bold">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 mb-4 border rounded"
            required
          />
          <label className="mb-2 font-bold">Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 mb-4 border rounded"
            required
          />
          {error && <p className="text-red-600 mb-4">{error}</p>}
          <button
            type="submit"
            className="p-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-800"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
