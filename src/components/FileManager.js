import { useState, useEffect } from "react";
import { auth, storage } from "../firebase"; // Firebase Auth & Storage imports
import { signOut, createUserWithEmailAndPassword, sendSignInLinkToEmail, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { ref, uploadBytes, listAll, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import CryptoJS from "crypto-js"; // Make sure to install crypto-js

const StoredSecure = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [file, setFile] = useState(null);
  const [userFiles, setUserFiles] = useState([]);
  const [encryptionKey, setEncryptionKey] = useState("");
  const [fileToView, setFileToView] = useState(null);
  const [viewKeys, setViewKeys] = useState({}); // Store view keys for each file
  const [fileContent, setFileContent] = useState("");

  const handleLoginWithEmailOTP = async () => {
    try {
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      alert(`OTP sent to ${email}. Check your inbox!`);
    } catch (error) {
      alert("Error sending OTP: " + error.message);
    }
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Account created successfully!");
      setIsLoggedIn(true);
      loadUserFiles(); // Load files after sign up
    } catch (error) {
      alert("Sign up failed: " + error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      alert("Login successful!");
      setIsLoggedIn(true);
      loadUserFiles(); // Load user files after sign in
    } catch (error) {
      alert("Google sign in failed: " + error.message);
    }
  };

  const handleFileUpload = async () => {
    if (file && encryptionKey) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target.result;
        const encryptedData = CryptoJS.AES.encrypt(fileData, encryptionKey).toString();

        const fileName = `${uuidv4()}-${file.name}`;
        const encryptedStorageRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/encrypted/${fileName}`);
        const originalStorageRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/original/${fileName}`);
        
        // Upload the encrypted data
        const encryptedBlob = new Blob([encryptedData], { type: "text/plain" });
        await uploadBytes(encryptedStorageRef, encryptedBlob);
        
        // Upload the original file
        await uploadBytes(originalStorageRef, file);

        // Store the file name and encryption key in userFiles
        setUserFiles((prevFiles) => [
          ...prevFiles,
          { name: fileName, originalPath: originalStorageRef.fullPath, key: encryptionKey } // Store key with file
        ]);

        alert("File uploaded successfully!");
        loadUserFiles(); // Refresh the file list after upload
        setFile(null); // Reset the file input after upload
        setEncryptionKey(""); // Clear encryption key
      };
      reader.readAsText(file); // Read the file as text for encryption
    } else {
      alert("Please select a file and enter your encryption key!");
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
    const viewKey = viewKeys[file.name] || ""; // Lấy khóa cho tệp hiện tại từ state
    if (viewKey === file.key) { // So sánh khóa đã nhập với khóa lưu trữ của tệp
      try {
        const encryptedFileRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/encrypted/${file.name}`); // Đường dẫn đến tệp đã mã hóa
        const encryptedFileUrl = await getDownloadURL(encryptedFileRef); // Lấy URL của tệp đã mã hóa
        
        const response = await fetch(encryptedFileUrl);
        const encryptedData = await response.text(); // Lấy dữ liệu mã hóa dưới dạng văn bản
        
        // Giải mã dữ liệu
        const decryptedData = CryptoJS.AES.decrypt(encryptedData, viewKey).toString(CryptoJS.enc.Utf8);
        
        if (decryptedData) {
          setFileContent(decryptedData); // Đặt nội dung tệp đã giải mã để hiển thị
          setFileToView(file.name); // Đặt tên tệp để hiển thị
        } else {
          alert("Failed to decrypt the file. Please check the encryption key.");
        }
      } catch (error) {
        alert("Error viewing file: " + error.message);
      }
    } else {
      alert("You must enter the correct encryption key to view the file!");
    }
  };

  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      signOut(auth)
        .then(() => {
          setIsLoggedIn(false);
          alert("Signed out successfully!");
        })
        .catch((error) => {
          alert("Sign out failed: " + error.message);
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
    setFile(droppedFile); // Update the file state with the dropped file
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
              className="mb-3 p-3 border rounded w-full"
            />
            <button onClick={handleLoginWithEmailOTP} className="bg-blue-600 text-white rounded p-3 w-full hover:bg-blue-700">Send OTP</button>
            <button onClick={handleGoogleSignIn} className="bg-red-600 text-white rounded p-3 w-full hover:bg-red-700 mt-4">Login with Google</button>

            <h2 className="text-2xl font-bold mb-4 mt-6 text-center">Sign Up</h2>
            <input 
              type="password" 
              placeholder="Password" 
              onChange={(e) => setPassword(e.target.value)} 
              className="mb-3 p-3 border rounded w-full" 
            />
            <input 
              type="password" 
              placeholder="Confirm Password" 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className="mb-4 p-3 border rounded w-full"
            />
            <button onClick={handleSignUp} className="bg-green-600 text-white rounded p-3 w-full hover:bg-green-700">Sign Up</button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4">File Manager</h2>
            <div 
              onDragOver={handleDragOver} 
              onDrop={handleDrop} 
              onClick={() => document.getElementById("fileInput").click()} 
              className="border-dashed border-4 border-gray-300 h-40 flex items-center justify-center mb-4 cursor-pointer"
            >
              {file ? (
                <p>{file.name}</p>
              ) : (
                <p className="text-lg">Drag & Drop your file here or click to select</p>
              )}
            </div>
            <input 
              id="fileInput" 
              type="file" 
              onChange={(e) => setFile(e.target.files[0])} 
              className="hidden" 
            />
            <input 
              type="password" 
              placeholder="Enter encryption key" 
              value={encryptionKey} 
              onChange={(e) => setEncryptionKey(e.target.value)} 
              className="mb-2 p-3 border rounded w-full" 
            />
            <button onClick={handleFileUpload} className="bg-green-500 text-white rounded p-3 w-full hover:bg-green-600">Upload</button>
            <div className="mt-4">
              {userFiles.length > 0 ? (
                <ul>
                  {userFiles.map((file, index) => (
                    <li key={index} className="mb-2">
                      <div className="flex items-center">
                        <span className="mr-2">{file.name}</span>
                        <input 
                          type="password" 
                          placeholder="Enter view key" 
                          value={viewKeys[file.name] || ""} 
                          onChange={(e) => handleViewKeyChange(file.name, e.target.value)} 
                          className="mr-2 p-3 border rounded" 
                        />
                        <button onClick={() => handleViewFile(file)} className="bg-blue-500 text-white rounded p-3 hover:bg-blue-600">View</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No files available. Please upload files to see them here.</p>
              )}
            </div>
            <button onClick={handleSignOut} className="bg-red-500 text-white rounded p-3 mt-4 w-full hover:bg-red-600">Sign Out</button>
            {fileToView && (
              <div className="mt-4 bg-gray-100 p-4 rounded">
                <h3 className="font-bold">Viewing File: {fileToView}</h3>
                <pre>{fileContent}</pre> {/* Display the content of the file */}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StoredSecure;
