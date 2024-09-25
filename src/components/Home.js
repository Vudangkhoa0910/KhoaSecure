import React, { useState } from "react";
import CryptoJS from "crypto-js";
import { db, storage } from "../firebase"; // Firebase imports
import { doc, setDoc } from "firebase/firestore"; // Firestore methods
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Storage methods

const Home = () => {
  const [file, setFile] = useState(null);
  const [encryptedFile, setEncryptedFile] = useState("");
  const [decryptedFile, setDecryptedFile] = useState(null);
  const [key, setKey] = useState("");
  const [algorithm, setAlgorithm] = useState("AES");
  const [outputFormat, setOutputFormat] = useState("none");
  const [downloadURL, setDownloadURL] = useState(""); // State for the download link

  // Utility to handle file uploads to Firebase
  const uploadToFirebase = async (fileData, folder, fileName) => {
    const storageRef = ref(storage, `${folder}/${fileName}`);
    await uploadBytes(storageRef, fileData);
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`${fileName} is available at: ${downloadURL}`);
    return downloadURL;
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      // Upload original file to Firebase in 'uploads/originals/'
      await uploadToFirebase(selectedFile, 'uploads/originals', selectedFile.name);
    }
  };

  const handleEncrypt = async () => {
    if (file && key) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = e.target.result;
        const encrypted = CryptoJS.AES.encrypt(fileData, key).toString();
        setEncryptedFile(encrypted);
        alert("File mã hóa thành công!");

        // Convert encrypted data to a Blob for uploading
        const encryptedBlob = new Blob([encrypted], { type: 'text/plain' });

        // Save encrypted file to Firebase in 'uploads/encryption/'
        const url = await uploadToFirebase(encryptedBlob, 'uploads/encryption', `${file.name}.encrypted`);
        setDownloadURL(url); // Set the download link

        // Save encrypted file details to Firestore
        await saveEncryptedFile(encrypted);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Vui lòng tải lên file và nhập khóa mã hóa.");
    }
  };

  const saveEncryptedFile = async (encrypted) => {
    const docRef = doc(db, "encryptedFiles", "myEncryptedFile"); // Create a new document
    await setDoc(docRef, {
      fileData: encrypted,
      timestamp: new Date().toISOString()
    });
    alert("File đã mã hóa được lưu vào System của bạn!");
  };

  const handleDecrypt = () => {
    if (encryptedFile && key) {
      const decrypted = CryptoJS.AES.decrypt(encryptedFile, key);
      const originalData = decrypted.toString(CryptoJS.enc.Utf8);
      setDecryptedFile(originalData);
      alert("Giải mã thành công!");

      // Upload decrypted file to Firebase in 'uploads/decryption/'
      const decryptedBlob = new Blob([originalData], { type: 'text/plain' });
      uploadToFirebase(decryptedBlob, 'uploads/decryption', `${file.name}.decrypted`);
    } else {
      alert("Vui lòng nhập file đã mã hóa và khóa.");
    }
  };

  const handleDownloadEncrypted = () => {
    if (!encryptedFile) {
      alert("Không có dữ liệu mã hóa để tải xuống.");
      return;
    }
    const blob = new Blob([encryptedFile], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'encrypted_file.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (downloadURL) {
      // Copy the download URL to the clipboard
      navigator.clipboard.writeText(downloadURL).then(() => {
        alert("Link tải xuống đã được sao chép vào clipboard!");
      }).catch(err => {
        alert("Lỗi khi sao chép link: ", err);
      });
    } else {
      alert("Không có link tải xuống để chia sẻ.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-black to-purple-900 text-green-400">
      <h1 className="text-5xl font-bold mb-6">Khoa Secure</h1>
      <input
        type="file"
        onChange={handleFileUpload}
        className="mb-4 p-2 bg-gray-800 text-white rounded"
      />
      <input
        type="text"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Nhập khóa mã hóa"
        className="mb-4 p-2 bg-gray-800 text-white rounded"
      />
      <select
        value={algorithm}
        onChange={(e) => setAlgorithm(e.target.value)}
        className="mb-4 p-2 bg-gray-800 text-white rounded"
      >
        <option value="AES">AES</option>
        <option value="DES">DES</option>
        <option value="TripleDES">Triple DES</option>
      </select>
      <div className="mb-4">
        <label className="mr-4">Chọn định dạng sau giải mã:</label>
        <select
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value)}
          className="p-2 bg-gray-800 text-white rounded"
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
        <button
          onClick={handleEncrypt}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Mã hóa
        </button>
        <button
          onClick={handleDownloadEncrypted}
          className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          disabled={!encryptedFile}
        >
          Tải xuống file mã hóa
        </button>
        <button
          onClick={handleDecrypt}
          className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Giải mã
        </button>
        <button
          onClick={handleShare}
          className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={!downloadURL}
        >
          Chia sẻ
        </button>
      </div>
      {encryptedFile && (
        <div className="mt-6">
          <h3 className="text-xl">Dữ liệu đã mã hóa:</h3>
          <textarea
            className="mt-2 p-2 bg-gray-800 text-white w-full"
            rows="5"
            value={encryptedFile}
            readOnly
          />
        </div>
      )}
      {decryptedFile && (
        <div className="mt-6">
          <h3 className="text-xl">File sau khi giải mã:</h3>
          <div className="mt-2 bg-gray-800 text-white p-4 rounded">
            <a
              href={decryptedFile}
              download={`decrypted_file.${outputFormat === 'none' ? 'plain' : outputFormat}`}
              className="text-blue-400 underline"
            >
              Tải xuống file gốc
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
