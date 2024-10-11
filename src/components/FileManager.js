import { useState, useEffect } from "react";
import { auth, storage } from "../firebase"; // Firebase Auth & Storage imports
import { signOut, createUserWithEmailAndPassword, sendSignInLinkToEmail, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { ref, uploadBytes, listAll, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import CryptoJS from "crypto-js"; // Make sure to install crypto-js
import { ToastContainer, toast } from 'react-toastify'; // Import Toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for Toastify

const StoredSecure = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [file, setFile] = useState(null);
  const [userFiles, setUserFiles] = useState([]);
  const [encryptionKey, setEncryptionKey] = useState("");
  const [viewKeys, setViewKeys] = useState({});
  const [fileContent, setFileContent] = useState("");
  const [cameraRecording, setCameraRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [decryptedFileURL, setDecryptedFileURL] = useState("");
  const [droppedFileName, setDroppedFileName] = useState(""); // State để lưu tên tệp đã thả
  const [fileInfo, setFileInfo] = useState(null); // Thêm state để lưu thông tin file

  const handleLoginWithEmailOTP = async () => {
    try {
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      toast(`OTP sent to ${email}. Check your inbox!`);
    } catch (error) {
      toast("Error sending OTP: " + error.message);
    }
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      toast("Passwords do not match!");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast("Account created successfully!");
      setIsLoggedIn(true);
      loadUserFiles(); // Load files after sign up
    } catch (error) {
      toast("Sign up failed: " + error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      toast("Login successful!");
      setIsLoggedIn(true);
      loadUserFiles(); // Load user files after sign in
    } catch (error) {
      toast("Google sign in failed: " + error.message);
    }
  };

  const handleGenerateKey = () => {
    const key = uuidv4();
    setEncryptionKey(key);
    toast(`Generated key: ${key}`);
  };

  const handleFileUpload = async () => {
    const fixedKey = encryptionKey; // Use the generated key for encryption
    if (file && fixedKey) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target.result;
        const encryptedData = CryptoJS.AES.encrypt(fileData, fixedKey).toString();

        const fileName = `${uuidv4()}-${file.name}`;
        const encryptedStorageRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/encrypted/${fileName}`);
        const originalStorageRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/original/${fileName}`);

        const encryptedBlob = new Blob([encryptedData], { type: "text/plain" });
        await uploadBytes(encryptedStorageRef, encryptedBlob);
        await uploadBytes(originalStorageRef, file);

        setUserFiles((prevFiles) => [
          ...prevFiles,
          { name: fileName, originalPath: originalStorageRef.fullPath, key: fixedKey } // Use the generated key for storage
        ]);

        toast("File uploaded successfully!");
        loadUserFiles();
        setFile(null);
        setEncryptionKey(""); // Clear encryption key after upload
      };
      reader.readAsText(file); // Read the file as text for encryption
    } else {
      toast("Please select a file and enter your encryption key!");
    }
  };

  const loadUserFiles = async () => {
    if (isLoggedIn) {
      const folderRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/encrypted`);
      const fileList = await listAll(folderRef);
      const files = await Promise.all(
        fileList.items.map(async (item) => {
          return {
            name: item.name,
            originalPath: `StoredSecure/${auth.currentUser.uid}/original/${item.name}`,
            key: item.name.split('-')[0], // Assuming the key is part of the file name
          };
        })
      );
      setUserFiles(files);
    }
  };

  const handleViewFile = async (file) => {
    const fileKey = viewKeys[file.name];
    if (!fileKey) {
      toast("Please enter the view key!");
      return;
    }

    // Start camera recording for 3 seconds
    setCameraRecording(true);
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(async (stream) => {
        const mediaRecorder = new MediaRecorder(stream);
        const recordedChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          recordedChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(recordedChunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          setRecordedVideo(url);
          setCameraRecording(false);

          // Get the encrypted file from Firebase
          const encryptedFileRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/encrypted/${file.name}`);
          const downloadURL = await getDownloadURL(encryptedFileRef);

          const response = await fetch(downloadURL);
          const encryptedData = await response.text();

          // Decrypt the file using the view key
          const decryptedData = CryptoJS.AES.decrypt(encryptedData, fileKey).toString(CryptoJS.enc.Utf8);

          if (!decryptedData) {
            toast("Invalid key or failed to decrypt the file!");
            return;
          }

          setFileContent(decryptedData); // Đặt nội dung để hiển thị

          // Lấy URL cho tệp gốc
          const originalFileRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/original/${file.name}`);
          const originalDownloadURL = await getDownloadURL(originalFileRef);
          setDecryptedFileURL(originalDownloadURL); // Lưu URL để tải xuống tệp gốc
        };

        mediaRecorder.start();
        setTimeout(() => {
          mediaRecorder.stop();
        }, 3000); // Stop recording after 3 seconds
      })
      .catch(error => {
        toast("Error accessing camera: " + error.message);
        setCameraRecording(false);
      });
  };

  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      signOut(auth)
        .then(() => {
          setIsLoggedIn(false);
          toast("Signed out successfully!");
        })
        .catch((error) => {
          toast("Sign out failed: " + error.message);
        });
    }
  };

  // Handle drag & drop
  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile); // Cập nhật trạng thái file với file đã thả
      setDroppedFileName(droppedFile.name); // Lưu tên tệp đã thả

      // Hiển thị thông tin file
      setFileInfo({
        name: droppedFile.name,
        size: droppedFile.size,
        type: droppedFile.type
      });
    }
  };

  const handleViewKeyChange = (fileName, key) => {
    setViewKeys((prevKeys) => ({
      ...prevKeys,
      [fileName]: key // Update the key for the specific file
    }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 to-purple-800 text-white p-6">
      <h1 className="text-5xl font-extrabold mb-8">Khoa Secure</h1>
      <div className="bg-white text-gray-800 p-8 rounded-lg shadow-lg w-full max-w-xl flex flex-col">
        {!isLoggedIn ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
            <input 
              type="email" 
              placeholder="Email" 
              onChange={(e) => setEmail(e.target.value)} 
              className="p-2 mb-4 border border-gray-300 rounded" 
            />
            <input 
              type="password" 
              placeholder="Password" 
              onChange={(e) => setPassword(e.target.value)} 
              className="p-2 mb-4 border border-gray-300 rounded" 
            />
            <button 
              onClick={handleLoginWithEmailOTP} 
              className="bg-blue-500 text-white py-2 rounded mb-4">Send OTP</button>
            <h2 className="text-2xl font-bold mb-4 text-center">Or Sign Up</h2>
            <input 
              type="password" 
              placeholder="Confirm Password" 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className="p-2 mb-4 border border-gray-300 rounded" 
            />
            <button 
              onClick={handleSignUp} 
              className="bg-green-500 text-white py-2 rounded mb-4">Sign Up</button>
            <button 
              onClick={handleGoogleSignIn} 
              className="bg-red-500 text-white py-2 rounded">Sign in with Google</button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center">Welcome, {auth.currentUser.email}</h2>
            <button onClick={handleSignOut} className="bg-red-500 text-white py-2 rounded mb-4">Sign Out</button>

            <h3 className="text-xl mb-4">Upload File</h3>
            <div 
              className="border-2 border-dashed border-gray-300 p-6 mb-4 text-center" 
              onDragOver={handleDragOver} 
              onDrop={handleDrop}>
              <p>Drag & Drop your file here or</p>
              <input 
                type="file" 
                onChange={(e) => setFile(e.target.files[0])} 
                className="mt-4" 
              />
            </div>
            {droppedFileName && <p className="text-green-500">Dropped File: {droppedFileName}</p>}
            {fileInfo && (
              <div className="mb-4">
                <p>File Name: {fileInfo.name}</p>
                <p>File Size: {fileInfo.size} bytes</p>
                <p>File Type: {fileInfo.type}</p>
              </div>
            )}
            <input 
              type="text" 
              placeholder="Enter Encryption Key" 
              value={encryptionKey} 
              onChange={(e) => setEncryptionKey(e.target.value)} 
              className="p-2 mb-4 border border-gray-300 rounded" 
            />
            <button 
              onClick={handleGenerateKey} 
              className="bg-yellow-500 text-white py-2 rounded mb-4">Generate Key</button>
            <button 
              onClick={handleFileUpload} 
              className="bg-blue-500 text-white py-2 rounded">Upload File</button>

            <h3 className="text-xl mb-4 mt-8">Your Files</h3>
            <ul>
              {userFiles.map((file) => (
                <li key={file.name} className="flex justify-between items-center mb-2">
                  <span>{file.name}</span>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Enter View Key" 
                      onChange={(e) => handleViewKeyChange(file.name, e.target.value)} 
                      className="p-1 border border-gray-300 rounded" 
                    />
                    <button 
                      onClick={() => handleViewFile(file)} 
                      className="bg-green-500 text-white py-1 rounded ml-2">View</button>
                  </div>
                </li>
              ))}
            </ul>

            {cameraRecording && <p className="text-yellow-500">Recording camera for 3 seconds...</p>}
            {recordedVideo && (
              <video controls src={recordedVideo} className="mt-4"></video>
            )}
            {fileContent && (
              <div className="mt-4">
                <h4 className="text-lg font-bold">File Content:</h4>
                {decryptedFileURL && (
                  <a href={decryptedFileURL} className="text-blue-500" download>Download Original File</a>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <ToastContainer /> {/* Thêm ToastContainer để hiển thị thông báo */}
    </div>
  );
};

export default StoredSecure;
