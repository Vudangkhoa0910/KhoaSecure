import React, { useState } from "react";
import CryptoJS from "crypto-js";
import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Link } from "react-router-dom";

const Home = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [encryptedFile, setEncryptedFile] = useState("");
  const [decryptedFile, setDecryptedFile] = useState(null);
  const [key, setKey] = useState("");
  const [outputFormat, setOutputFormat] = useState("none");
  const [downloadURL, setDownloadURL] = useState("");

  // Firebase upload logic
  const uploadToFirebase = async (fileData, folder, fileName) => {
    const storageRef = ref(storage, `${folder}/${fileName}`);
    await uploadBytes(storageRef, fileData);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  // Handling file upload
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      await uploadToFirebase(selectedFile, "uploads/originals", selectedFile.name);
    }
  };

  // Drag and Drop events
  const handleDragOver = (e) => e.preventDefault();
  const handleDragEnter = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const selectedFile = droppedFiles[0];
      setFile(selectedFile);
      await uploadToFirebase(selectedFile, "uploads/originals", selectedFile.name);
    }
  };

  // File encryption logic
  const handleEncrypt = async () => {
    if (file && key) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = e.target.result;
        const encrypted = CryptoJS.AES.encrypt(fileData, key).toString();
        setEncryptedFile(encrypted);
        alert("File mã hóa thành công!");

        const encryptedBlob = new Blob([encrypted], { type: "text/plain" });
        const url = await uploadToFirebase(encryptedBlob, "uploads/encryption", `${file.name}.encrypted`);
        setDownloadURL(url);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Vui lòng tải lên file và nhập khóa mã hóa.");
    }
  };

  // File decryption logic
  const handleDecrypt = () => {
    if (encryptedFile && key) {
      const decrypted = CryptoJS.AES.decrypt(encryptedFile, key);
      const originalData = decrypted.toString(CryptoJS.enc.Utf8);
      setDecryptedFile(originalData);
      alert("Giải mã thành công!");

      const decryptedBlob = new Blob([originalData], { type: "text/plain" });
      uploadToFirebase(decryptedBlob, "uploads/decryption", `${file.name}.decrypted`);
    } else {
      alert("Vui lòng nhập file đã mã hóa và khóa.");
    }
  };

  const handleDownloadEncrypted = () => {
    if (!encryptedFile) {
      alert("Không có dữ liệu mã hóa để tải xuống.");
      return;
    }
    const blob = new Blob([encryptedFile], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "encrypted_file.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (downloadURL) {
      navigator.clipboard.writeText(downloadURL).then(() => {
        alert("Link tải xuống đã được sao chép vào clipboard!");
      }).catch(err => alert("Lỗi khi sao chép link: ", err));
    } else {
      alert("Không có link tải xuống để chia sẻ.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-start p-6 bg-gray-50">
      <h1 className="text-5xl font-extrabold mb-8 text-gray-800">Khoa Secure</h1>

      <div
        className={`w-full max-w-lg h-64 flex flex-col items-center justify-center border-4 border-dashed rounded-lg transition-all ${dragActive ? "border-green-500" : "border-gray-600"}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("fileInput").click()}
      >
        <p className="text-center text-lg text-gray-800">
          {file ? `File đã chọn: ${file.name}` : dragActive ? "Thả file vào đây" : "Kéo file vào đây hoặc nhấn để chọn"}
        </p>
        <input id="fileInput" type="file" onChange={handleFileUpload} className="hidden" />
      </div>

      <div className="mt-6 w-full max-w-lg">
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Nhập khóa mã hóa"
          className="p-3 w-full bg-gray-800 text-white rounded mb-4"
        />

        <div className="flex justify-between mb-4">
          <select
            value="AES" // Fixed value to "AES" as per your original design
            className="p-3 bg-gray-800 text-white rounded w-48"
            disabled
          >
            <option value="AES">AES</option>
          </select>

          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            className="p-3 bg-gray-800 text-white rounded w-48"
          >
            <option value="none">None</option>
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
            <option value="mp3">MP3</option>
            <option value="mp4">MP4</option>
            <option value="txt">TXT</option>
          </select>
        </div>

        <div className="flex gap-4">
          <button onClick={handleEncrypt} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded flex-1">Mã hóa</button>
          <button onClick={handleDownloadEncrypted} className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded flex-1" disabled={!encryptedFile}>Tải file mã hóa</button>
          <button onClick={handleDecrypt} className="p-3 bg-red-600 hover:bg-red-700 text-white rounded flex-1">Giải mã</button>
          <button onClick={handleShare} className="p-3 bg-green-600 hover:bg-green-700 text-white rounded flex-1" disabled={!downloadURL}>Chia sẻ</button>
        </div>
      </div>

      {encryptedFile && (
        <div className="mt-8 w-full max-w-lg">
          <h3 className="text-xl mb-2">Dữ liệu mã hóa:</h3>
          <textarea className="w-full h-32 bg-gray-900 text-white p-4 rounded" readOnly value={encryptedFile} />
        </div>
      )}

      {decryptedFile && (
        <div className="mt-8 w-full max-w-lg">
          <h3 className="text-xl mb-2">Dữ liệu đã giải mã:</h3>
          <textarea className="w-full h-32 bg-gray-900 text-white p-4 rounded" readOnly value={decryptedFile} />
          <div className="mt-4">
            <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(decryptedFile)}`} download={`decrypted_file.${outputFormat}`} className="text-blue-400 underline">Tải file đã giải mã</a>
          </div>
        </div>
      )}

      <Link to="/file-manager">
        <button className="mt-8 p-3 bg-teal-600 hover:bg-teal-700 text-white rounded">Quản lý lưu trữ bảo mật</button>
      </Link>
    </div>
  );
};

export default Home;
