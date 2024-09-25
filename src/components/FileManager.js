// src/components/FileManager.js
import React, { useState } from "react";
import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import CryptoJS from "crypto-js";

const FileManager = () => {
  const [file, setFile] = useState(null);
  const [key, setKey] = useState("");
  const [encryptedFile, setEncryptedFile] = useState("");

  const handleFileUpload = (e) => {
    setFile(e.target.files[0]);
  };

  const handleEncryptAndUpload = async () => {
    if (file && key) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = e.target.result;
        const encrypted = CryptoJS.AES.encrypt(fileData, key).toString();

        const blob = new Blob([encrypted], { type: "text/plain" });
        const storageRef = ref(storage, `uploads/${file.name}`);
        await uploadBytes(storageRef, blob);
        alert("File mã hóa đã tải lên thành công!");
      };
      reader.readAsText(file);
    } else {
      alert("Vui lòng chọn file và nhập khóa.");
    }
  };

  return (
    <div>
      <h2>Quản Lý File</h2>
      <input type="file" onChange={handleFileUpload} />
      <input
        type="text"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Nhập khóa mã hóa"
      />
      <button onClick={handleEncryptAndUpload}>Tải lên file mã hóa</button>
    </div>
  );
};

export default FileManager;
