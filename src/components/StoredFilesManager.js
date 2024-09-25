import React, { useState, useEffect } from "react";
import { storage, auth, db } from "../firebase"; // Firebase imports
import { ref, uploadBytes, listAll, getDownloadURL, deleteObject } from "firebase/storage";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // Firestore methods

const StoredFilesManager = () => {
  const [file, setFile] = useState(null);
  const [storedFiles, setStoredFiles] = useState([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Listen for authentication changes
  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().role === "admin") {
          setAuthenticated(true); // Only admin users can access this area
        }
        setUser(user);
      }
    });
  }, []);

  // Handle file upload to Firebase under 'Stored' folder
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      const storageRef = ref(storage, `stored/${selectedFile.name}`);
      await uploadBytes(storageRef, selectedFile);
      alert("File uploaded successfully!");
      fetchStoredFiles(); // Refresh file list after upload
    }
  };

  // Fetch stored files from Firebase
  const fetchStoredFiles = async () => {
    const storageRef = ref(storage, "stored/");
    const filesList = await listAll(storageRef);
    const files = await Promise.all(
      filesList.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return { name: itemRef.name, url };
      })
    );
    setStoredFiles(files);
  };

  // Delete a file from Firebase
  const handleFileDelete = async (fileName) => {
    const fileRef = ref(storage, `stored/${fileName}`);
    await deleteObject(fileRef);
    alert(`${fileName} has been deleted!`);
    fetchStoredFiles(); // Refresh file list after deletion
  };

  // Authenticate user (admin access required)
  const handleLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Authenticated successfully!");
    } catch (error) {
      alert("Authentication failed.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-black to-purple-900 text-green-400">
      <h1 className="text-4xl font-bold mb-4">Stored File Manager</h1>

      {!authenticated ? (
        <div className="mb-4">
          <h3 className="text-2xl">Admin Login</h3>
          <input
            type="email"
            placeholder="Email"
            className="p-2 mb-2 bg-gray-800 text-white rounded"
            onChange={(e) => setUser({ ...user, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            className="p-2 mb-2 bg-gray-800 text-white rounded"
            onChange={(e) => setUser({ ...user, password: e.target.value })}
          />
          <button
            onClick={() => handleLogin(user.email, user.password)}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Login
          </button>
        </div>
      ) : (
        <div className="stored-section">
          <div className="file-upload mb-4">
            <input
              type="file"
              onChange={handleFileUpload}
              className="p-2 bg-gray-800 text-white rounded"
            />
          </div>
          <div className="stored-files mb-4">
            <h3 className="text-2xl mb-2">Stored Files:</h3>
            {storedFiles.length === 0 ? (
              <p>No files available.</p>
            ) : (
              <ul>
                {storedFiles.map((file, index) => (
                  <li key={index} className="flex justify-between items-center mb-2">
                    <a href={file.url} download={file.name} className="text-blue-400 underline">
                      {file.name}
                    </a>
                    <button
                      onClick={() => handleFileDelete(file.name)}
                      className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoredFilesManager;
