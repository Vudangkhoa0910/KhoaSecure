import { useState } from "react";
import { auth, storage } from "../firebase"; // Firebase Auth & Storage imports
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
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
  const [filePassword, setFilePassword] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [accessFiles, setAccessFiles] = useState([]);
  const [downloadKeys, setDownloadKeys] = useState({}); // State to store download keys for each file

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsLoggedIn(true);
      alert("Logged in successfully!");
      loadUserFiles(); // Load files after login
    } catch (error) {
      alert("Login failed: " + error.message);
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

        // Store the correct file path in userFiles
        setUserFiles((prevFiles) => [
          ...prevFiles,
          { name: fileName, originalPath: originalStorageRef.fullPath }
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
          const url = await getDownloadURL(item);
          return { name: item.name, url, originalPath: `StoredSecure/${auth.currentUser.uid}/original/${item.name}` }; // Ensure correct originalPath
        })
      );
      setUserFiles(files);
      setAccessFiles([]); // Clear access files on loading new user files
    }
  };

  const handleAccessFiles = async () => {
    if (filePassword === password) {
      await loadUserFiles(); // Load user files after password validation
      setAccessFiles(userFiles);
    } else {
      alert("Incorrect password!");
    }
  };

  const handleDownloadFile = async (file) => {
    const key = downloadKeys[file.name]; // Get the specific key for the current file
    if (key === encryptionKey) { // Compare the entered key with the stored encryption key
      try {
        const originalFileRef = ref(storage, file.originalPath); // Use the original path stored in the file object
        const originalFileUrl = await getDownloadURL(originalFileRef);
        const link = document.createElement('a'); // Create a link element
        link.href = originalFileUrl; // Set the link's href to the file URL
        link.download = file.name; // Set the download attribute with the file name
        document.body.appendChild(link); // Append the link to the body
        link.click(); // Programmatically click the link to trigger the download
        document.body.removeChild(link); // Remove the link from the document
      } catch (error) {
        alert("Download failed: " + error.message);
      }
    } else {
      alert("You must enter the correct encryption key to download the file!");
    }
  };

  const handleKeyChange = (fileName, key) => {
    setDownloadKeys((prevKeys) => ({
      ...prevKeys,
      [fileName]: key,
    })); // Update the specific key for the file
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 to-purple-800 text-white p-0 m-0">
      <h1 className="text-5xl font-extrabold mb-8">Khoa Secure</h1>
      <div className="bg-white text-gray-800 p-6 rounded-t-lg shadow-lg w-full max-w-md flex flex-col">
        {!isLoggedIn ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
            <input 
              type="email" 
              placeholder="Email" 
              onChange={(e) => setEmail(e.target.value)} 
              className="mb-3 p-2 border rounded w-full"
            />
            <input 
              type="password" 
              placeholder="Password" 
              onChange={(e) => setPassword(e.target.value)} 
              className="mb-4 p-2 border rounded w-full" 
            />
            <button onClick={handleLogin} className="bg-blue-600 text-white rounded p-2 w-full hover:bg-blue-700">Login</button>

            <h2 className="text-2xl font-bold mb-4 mt-6 text-center">Sign Up</h2>
            <input 
              type="password" 
              placeholder="Password" 
              onChange={(e) => setPassword(e.target.value)} 
              className="mb-3 p-2 border rounded w-full" 
            />
            <input 
              type="password" 
              placeholder="Confirm Password" 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className="mb-4 p-2 border rounded w-full" 
            />
            <button onClick={handleSignUp} className="bg-green-600 text-white rounded p-2 w-full hover:bg-green-700">Sign Up</button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4">Secure Storage</h2>

            <div
              className="border-2 border-dashed border-green-500 p-4 mb-4 rounded cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {file ? (
                <p>{file.name}</p>
              ) : (
                <p>Drag & Drop your file here or click to select</p>
              )}
            </div>

            <input
              type="password"
              placeholder="Enter encryption key"
              value={encryptionKey}
              onChange={(e) => setEncryptionKey(e.target.value)}
              className="mb-2 p-2 border rounded w-full"
            />
            <button onClick={handleFileUpload} className="bg-green-500 text-white rounded p-2 w-full hover:bg-green-600">Upload</button>

            <input
              type="password"
              placeholder="Enter your file access password"
              value={filePassword}
              onChange={(e) => setFilePassword(e.target.value)}
              className="mb-2 p-2 border rounded w-full"
            />
            <button onClick={handleAccessFiles} className="bg-purple-500 text-white rounded p-2 w-full hover:bg-purple-600">Access Files</button>

            <div className="mt-4">
              {accessFiles.length > 0 ? (
                <ul>
                  {accessFiles.map((file, index) => (
                    <li key={index} className="mb-2">
                      <div className="flex items-center">
                        <span className="mr-2">{file.name}</span>
                        <input
                          type="password"
                          placeholder="Enter encryption key"
                          value={downloadKeys[file.name] || ""}
                          onChange={(e) => handleKeyChange(file.name, e.target.value)}
                          className="mr-2 p-2 border rounded"
                        />
                        <button onClick={() => handleDownloadFile(file)} className="bg-purple-500 text-white rounded p-2 hover:bg-purple-600">Download</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No files available. Please enter the correct password to access your files.</p>
              )}
            </div>
            <button onClick={handleSignOut} className="bg-red-500 text-white rounded p-2 mt-4 w-full hover:bg-red-600">Sign Out</button>
          </>
        )}
      </div>
    </div>
  );
};

export default StoredSecure;
