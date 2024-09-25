import React from 'react';
import Home from './components/Home';
import StoredSecure from './components/StoredSecure'; // Import component lưu trữ bảo mật
import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Import Router cho điều hướng

function App() {
  return (
    <Router>
      <div>
        {/* Analytics component */}
        <Analytics />

        {/* Định tuyến các trang */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stored" element={<StoredSecure />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
