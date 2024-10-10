import React, { useState } from "react";
import CryptoJS from "crypto-js";
import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Link } from "react-router-dom";
import forge from "node-forge";
import { ToastContainer, toast } from 'react-toastify'; // Import ToastContainer và toast
import 'react-toastify/dist/ReactToastify.css'; // Import CSS cho toast

const Home = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [encryptedFile, setEncryptedFile] = useState("");
  const [decryptedFile, setDecryptedFile] = useState(null);
  const [key, setKey] = useState(""); // For manual key input
  const [keyFile, setKeyFile] = useState(null); // For key file input
  const [algorithm, setAlgorithm] = useState("AES");
  const [outputFormat, setOutputFormat] = useState("none");
  const [downloadURL, setDownloadURL] = useState("");
  const [rsaPublicKey, setRsaPublicKey] = useState("");
  const [rsaPrivateKey, setRsaPrivateKey] = useState("");

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

  // Handle key input (manual or from file)
  const handleKeyInput = (e) => {
    const selectedKeyFile = e.target.files[0];
    if (selectedKeyFile) {
      setKeyFile(selectedKeyFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileKey = e.target.result;
        setKey(fileKey);
      };
      reader.readAsText(selectedKeyFile);
    }
  };  

  const handleKeyDrop = (e) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const keyFile = droppedFiles[0];
      setKeyFile(keyFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileKey = e.target.result;
        setKey(fileKey);
      };
      reader.readAsText(keyFile);
    }
  };  
  

  // File encryption logic
  // File encryption logic
const handleEncrypt = async () => {
  if (file && key) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileData = e.target.result; // ArrayBuffer (raw binary data)

      // Convert ArrayBuffer to WordArray for CryptoJS
      const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(fileData));

      let encrypted;
      if (algorithm === "AES") {
        // Encrypt using AES
        encrypted = CryptoJS.AES.encrypt(wordArray, key).toString();
      } else if (algorithm === "DES") {
        // Encrypt using DES
        encrypted = CryptoJS.DES.encrypt(wordArray, key).toString();
      } else if (algorithm === "RSA") {
        // Encrypt using RSA
        const publicKey = forge.pki.publicKeyFromPem(rsaPublicKey);
        const encryptedData = publicKey.encrypt(fileData, 'RSA-OAEP'); // Ensure OAEP is used
        encrypted = forge.util.encode64(encryptedData); // Convert to base64 for storage
      }

      setEncryptedFile(encrypted);
      toast("File mã hóa thành công!");

      // Convert encrypted string to Blob
      const encryptedBlob = new Blob([encrypted], { type: "text/plain" });
      const url = await uploadToFirebase(encryptedBlob, "uploads/encryption", `${file.name}.encrypted`);
      setDownloadURL(url);
    };
    reader.readAsArrayBuffer(file); // Read file as raw binary
  } else {
    toast("Vui lòng tải lên file và nhập khóa mã hóa.");
  }
};

// File decryption logic
const handleDecrypt = async () => {
  if (encryptedFile && key) {
    try {
      let decrypted;
      if (algorithm === "AES") {
        // Decrypt using AES
        decrypted = CryptoJS.AES.decrypt(encryptedFile, key);
      } else if (algorithm === "DES") {
        // Decrypt using DES
        decrypted = CryptoJS.DES.decrypt(encryptedFile, key);
      } else if (algorithm === "RSA") {
        // Decrypt using RSA
        const privateKey = forge.pki.privateKeyFromPem(rsaPrivateKey);
        const decodedData = forge.util.decode64(encryptedFile); // Decode from base64
        decrypted = privateKey.decrypt(decodedData, 'RSA-OAEP'); // Ensure OAEP is used
      }

      // Handle decrypted data correctly based on the algorithm used
      let decryptedBlob;
      if (algorithm === "RSA") {
        // Directly use decrypted data for RSA
        decryptedBlob = new Blob([decrypted], { type: file.type || "application/octet-stream" });
      } else {
        // Convert decrypted data from WordArray to a binary format (Uint8Array)
        const decryptedBase64 = decrypted.toString(CryptoJS.enc.Base64);
        const byteCharacters = atob(decryptedBase64); // Decode base64
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        decryptedBlob = new Blob([byteArray], { type: file.type || "application/octet-stream" });
      }

      toast("Giải mã thành công!");

      // Create a downloadable link for the decrypted file
      const url = URL.createObjectURL(decryptedBlob);
      
      // Create a link for downloading the file
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, "")}.${outputFormat}`; // Use original name + .decrypted + selected format
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url); // Clean up the URL object

    } catch (error) {
      toast("Giải mã thất bại: " + error.message);
    }
  } else {
    toast("Vui lòng nhập file đã mã hóa và khóa.");
  }
};


// Update the render method to display any relevant UI changes


  // Generate RSA Key Pair
  const generateRSAKeys = () => {
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
    const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

    setRsaPublicKey(publicKeyPem);
    setRsaPrivateKey(privateKeyPem);
  };

  // Download RSA keys
  const downloadKey = (key, fileName) => {
    const blob = new Blob([key], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadEncrypted = () => {
    if (!encryptedFile) {
      toast("Không có dữ liệu mã hóa để tải xuống.");
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
        toast("Link tải xuống đã được sao chép vào clipboard!");
      }).catch(err => toast("Lỗi khi sao chép link: ", err));
    } else {
      toast("Không có link tải xuống để chia sẻ.");
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
        <div 
          className={`p-2 border-dashed border-4 ${dragActive ? "border-green-500" : "border-gray-600"} rounded-lg mb-4`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleKeyDrop}
        >
          <p className="text-center text-lg text-gray-800 mb-1">
            Thả khóa vào đây hoặc chọn file hoặc nhập
          </p>
          <input
            type="file"
            onChange={handleKeyInput}
            className="p-2 bg-gray-200 rounded w-full"
          />
          <textarea
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Nhập khóa mã hóa thủ công"
            className="p-1 w-full bg-gray-800 text-white rounded mt-2"
          />
        </div>

        <div className="flex justify-between mb-4">
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            className="p-3 bg-gray-800 text-white rounded w-48"
          >
            <option value="AES">AES</option>
            <option value="DES">DES</option>
            <option value="RSA">RSA</option>
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

        <button onClick={generateRSAKeys} className="mt-6 p-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded w-full">
          Tạo RSA Key Pair
        </button>

        {rsaPublicKey && (
          <div className="mt-6 w-full max-w-lg">
            <h3 className="text-xl mb-2">RSA Public Key:</h3>
            <textarea className="w-full h-32 bg-gray-900 text-white p-4 rounded" readOnly value={rsaPublicKey} />
            <button onClick={() => downloadKey(rsaPublicKey, "public_key.pem")} className="mt-2 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded">Tải Public Key</button>
          </div>
        )}

        {rsaPrivateKey && (
          <div className="mt-6 w-full max-w-lg">
            <h3 className="text-xl mb-2">RSA Private Key:</h3>
            <textarea className="w-full h-32 bg-gray-900 text-white p-4 rounded" readOnly value={rsaPrivateKey} />
            <button onClick={() => downloadKey(rsaPrivateKey, "private_key.pem")} className="mt-2 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded">Tải Private Key</button>
          </div>
        )}
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
      <ToastContainer />
    </div>
  );
};

export default Home;
