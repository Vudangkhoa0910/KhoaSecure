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

        // Store both the encrypted file and the original file
        const encryptedStorageRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/encrypted/${uuidv4()}-${file.name}`);
        const originalStorageRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/original/${uuidv4()}-${file.name}`);
        
        // Upload the encrypted data
        const encryptedBlob = new Blob([encryptedData], { type: "text/plain" });
        await uploadBytes(encryptedStorageRef, encryptedBlob);
        
        // Upload the original file
        await uploadBytes(originalStorageRef, file);

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
          const originalFileName = item.name.replace(/^.*?-(.*)$/, "$1"); // Extract the original file name
          const originalFilePath = `StoredSecure/${auth.currentUser.uid}/original/${originalFileName}`;
          return { name: item.name, url, originalPath: originalFilePath }; // Store the original path
        })
      );
      setUserFiles(files);
      setAccessFiles([]); // Clear access files on loading new user files
    }
  };

  const handleAccessFiles = () => {
    if (filePassword === password) {
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-black to-teal-900 text-green-400">
      {!isLoggedIn ? (
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl">Login</h2>
          <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} className="mb-2 p-2 rounded" />
          <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} className="mb-2 p-2 rounded" />
          <button onClick={handleLogin} className="bg-green-500 text-white rounded p-2">Login</button>

          <h2 className="text-xl mt-4">Sign Up</h2>
          <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} className="mb-2 p-2 rounded" />
          <input type="password" placeholder="Confirm Password" onChange={(e) => setConfirmPassword(e.target.value)} className="mb-2 p-2 rounded" />
          <button onClick={handleSignUp} className="bg-blue-500 text-white rounded p-2">Sign Up</button>
        </div>
      ) : (
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl">Secure Storage</h2>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="mb-2"
          />
          <input
            type="password"
            placeholder="Enter encryption key"
            value={encryptionKey}
            onChange={(e) => setEncryptionKey(e.target.value)}
            className="mb-2 p-2 rounded"
          />
          <button onClick={handleFileUpload} className="bg-green-500 text-white rounded p-2">Upload</button>

          <input
            type="password"
            placeholder="Enter your file access password"
            value={filePassword} // Pre-fill the password field with the login password
            onChange={(e) => setFilePassword(e.target.value)}
            className="mb-2 p-2 rounded"
          />
          <button onClick={handleAccessFiles} className="bg-blue-500 text-white rounded p-2">View Files</button>
          
          <div className="mt-4">
            <h3 className="text-lg">Your Files:</h3>
            <ul className="mt-2 bg-gray-900 p-2 rounded">
              {accessFiles.length > 0 ? (
                accessFiles.map((file, index) => (
                  <li key={index} className="text-green-400 flex justify-between items-center">
                    {file.name}
                    <div className="flex items-center">
                      <input
                        type="password"
                        placeholder="Enter encryption key to download"
                        onChange={(e) => handleKeyChange(file.name, e.target.value)}
                        className="mb-2 p-1 rounded ml-2"
                      />
                      <button onClick={() => handleDownloadFile(file)} className="bg-yellow-500 text-white rounded p-1">Download</button>
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-red-500">No files found. Enter the correct password to view your files.</li>
              )}
            </ul>
          </div>
          <button onClick={() => signOut(auth)} className="bg-red-500 text-white rounded p-2 mt-4">Sign Out</button>
        </div>
      )}
    </div>
  );
};

export default StoredSecure;
