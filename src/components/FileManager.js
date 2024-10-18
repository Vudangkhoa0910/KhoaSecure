import React, { useState, useEffect } from "react";
import { auth, storage, db } from "../firebase";
import { Modal } from 'react-bootstrap'; 
import {
  signOut,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import {
  ref,
  uploadBytes,
  listAll,
  getDownloadURL,
  getMetadata,
  deleteObject,
} from "firebase/storage";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import { FaFolder, FaFileAlt, FaUpload, FaSignOutAlt, FaSearch, FaTrash, FaShareAlt, FaCopy, FaClipboard, FaPlus, FaLock } from "react-icons/fa";
import JSZip from "jszip";

const StoredSecure = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [file, setFile] = useState(null);
  const [userFiles, setUserFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState("original");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedFile, setCopiedFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [folderPasswords, setFolderPasswords] = useState({}); // Store folder passwords
  const [filePasswords, setFilePasswords] = useState({}); // Store file passwords
  const [showPasswordModal, setShowPasswordModal] = useState(false); // Modal control
  const [modalType, setModalType] = useState(""); // Type of password (folder/file)
  const [passwordInput, setPasswordInput] = useState(""); // Password entered in modal
  const [currentItem, setCurrentItem] = useState(""); // Current folder/file for password setting
  const [passwordPrompt, setPasswordPrompt] = useState({ isVisible: false, type: "", name: "" });
  const [enteredPassword, setEnteredPassword] = useState(""); // Lưu trữ mật khẩu đã nhập
  const [folderNamePrompt, setFolderNamePrompt] = useState({ isVisible: false, folderName: "" });


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsLoggedIn(true);
        loadUserFiles();
        loadUserFolders();
        loadFolderPasswords(); // Load folder passwords
      } else {
        setIsLoggedIn(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const savePassword = async (passwordData) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    if (passwordData.type === "folder") {
      const folderPasswordsRef = doc(db, `StoredSecure/${userId}`);
      const folderPasswordsSnap = await getDoc(folderPasswordsRef);
      const newFolderPasswords = folderPasswordsSnap.exists()
        ? folderPasswordsSnap.data().folderPasswords || {}
        : {};
      newFolderPasswords[passwordData.name] = passwordData.password;

      await setDoc(folderPasswordsRef, { folderPasswords: newFolderPasswords });
      setFolderPasswords(newFolderPasswords);
    } else if (passwordData.type === "file") {
      const newFilePasswords = { ...filePasswords, [passwordData.name]: passwordData.password };
      setFilePasswords(newFilePasswords);
    }

    toast(`${passwordData.type === "folder" ? "Folder" : "File"} password updated!`);
  };


const loadFolderPasswords = async () => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const folderPasswordsRef = doc(db, `StoredSecure/${userId}`); // Chỉ tạo một tài liệu

  const docSnap = await getDoc(folderPasswordsRef);
  if (docSnap.exists()) {
      setFolderPasswords(docSnap.data().folderPasswords || {});
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
      loadUserFiles();
      loadUserFolders();
    } catch (error) {
      toast("Sign up failed: " + error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast("Login successful!");
      loadUserFolders();
    } catch (error) {
      toast("Google sign in failed: " + error.message);
    }
  };

  const handleFileUpload = async (file) => {
    if (file) {
      const fileName = `${file.name}`;
      const storageRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/${activeFolder}/${fileName}`);
      await uploadBytes(storageRef, file);
      toast("File uploaded successfully!");
      loadUserFiles();
    } else {
      toast("Please select a file!");
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      for (let droppedFile of droppedFiles) {
        await handleFileUpload(droppedFile);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const loadUserFiles = async () => {
    const folderRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/${activeFolder}`);
    const fileList = await listAll(folderRef);
    const fileDetailsPromises = fileList.items.map(async (item) => {
      const metadata = await getMetadata(item);
      const downloadURL = await getDownloadURL(item);
      return {
        name: item.name,
        size: metadata.size,
        updated: metadata.updated,
        downloadURL,
        password: filePasswords[item.name] || "", // Get password if it exists
      };
    });
    const files = await Promise.all(fileDetailsPromises);
    setUserFiles(files);
  };

  const loadUserFolders = async () => {
    const baseRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/`);
    const folderList = await listAll(baseRef);
    const folderNames = folderList.prefixes.map(folder => folder.name.split('/').pop());
    setFolders(folderNames);
  };

  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      signOut(auth)
        .then(() => {
          setIsLoggedIn(false);
          toast("Signed out successfully!");
          setUserFiles([]);
          setFolders([]);
        })
        .catch((error) => {
          toast("Sign out failed: " + error.message);
        });
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredFiles = userFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (file) => {
    setCopiedFile(file);
    toast(`${file.name} copied to clipboard.`);
  };

  const handlePaste = async () => {
    if (copiedFile) {
      const storageRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/${activeFolder}/${copiedFile.name}`);
      const copiedFileRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/${activeFolder}/copy_of_${copiedFile.name}`);

      await uploadBytes(copiedFileRef, copiedFile);
      toast(`Copied ${copiedFile.name} to ${activeFolder}.`);
      loadUserFiles();
    } else {
      toast("No file to paste.");
    }
  };

  const handleDelete = async (file) => {
    if (window.confirm(`Are you sure you want to delete ${file.name}?`)) {
      try {
        const currentUser = auth.currentUser;
  
        // Tham chiếu đến file cũ và thư mục Trash
        const oldFileRef = ref(storage, `StoredSecure/${currentUser.uid}/${activeFolder}/${file.name}`);
        const trashFileRef = ref(storage, `StoredSecure/${currentUser.uid}/trash/${file.name}`);
  
        // Lấy URL tải xuống để di chuyển file
        const downloadURL = await getDownloadURL(oldFileRef);
        const blob = await fetch(downloadURL).then((response) => response.blob());
  
        // Tải lên file vào thư mục Trash
        const uploadTask = await uploadBytes(trashFileRef, blob); // Sử dụng uploadBytes để tải lên blob
  
        // Kiểm tra xem file đã được tải lên thành công
        if (uploadTask) {
          // Sau khi tải lên thành công, xóa file cũ
          await deleteObject(oldFileRef);
  
          toast.success(`${file.name} has been moved to Trash.`); // Thông báo thành công
          loadUserFiles(); // Load lại danh sách file sau khi xóa
        } else {
          throw new Error("Failed to upload to Trash.");
        }
      } catch (error) {
        console.error("Error moving file to trash:", error);
        toast.error(`Failed to delete ${file.name}.`); // Thông báo lỗi
      }
    }
  };
  

  

  const handleZipDownload = async () => {
    const zip = new JSZip();
    filteredFiles.forEach(file => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", file.downloadURL, true);
      xhr.responseType = "blob";
      xhr.onload = function () {
        zip.file(file.name, xhr.response);
      };
      xhr.send();
    });
    zip.generateAsync({ type: "blob" }).then((content) => {
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "files.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast("Files downloaded as ZIP.");
    });
  };

  const handleCreateFolder = async () => {
    if (folderNamePrompt.folderName) {
      const folderRef = ref(storage, `StoredSecure/${auth.currentUser.uid}/${folderNamePrompt.folderName}/dummy.txt`);
      const blob = new Blob();
  
      try {
        await uploadBytes(folderRef, blob);
        toast(`Folder "${folderNamePrompt.folderName}" created successfully!`);
        loadUserFolders();
        setFolderNamePrompt({ isVisible: false, folderName: "" }); // Đóng modal sau khi tạo thành công
      } catch (error) {
        toast("Failed to create folder: " + error.message);
      }
    }
  };

  const handleSetFolderPassword = (folderName) => {
    setModalType("setFolderPassword"); // Đặt loại modal là để đặt mật khẩu cho thư mục
    setCurrentItem(folderName); // Lưu tên thư mục hiện tại
    setShowPasswordModal(true); // Hiển thị modal nhập mật khẩu
  };
  

  const handleSetFilePassword = (file) => {
    setModalType("setFilePassword"); // Thay đổi thành setFilePassword
    setCurrentItem(file.name); // Lưu tên file hiện tại
    setPasswordInput(""); // Xóa giá trị nhập trước đó
    setShowPasswordModal(true); // Hiển thị modal yêu cầu mật khẩu
  };
  

  const handleModalSave = () => {
    if (modalType === "folder") {
      // Kiểm tra mật khẩu nhập vào có khớp với mật khẩu của thư mục
      if (folderPasswords[currentItem] === passwordInput) {
        // Mật khẩu đúng -> mở folder
        setActiveFolder(currentItem);
        handleFolderAction("loadFiles");
      } else {
        // Mật khẩu sai -> hiển thị thông báo lỗi
        alert("Wrong password!");
      }
    } else if (modalType === "setFolderPassword") {
      // Nếu modal là để đặt mật khẩu cho thư mục
      setFolderPassword(currentItem, passwordInput); // Cập nhật mật khẩu cho thư mục
      toast(`Password set for folder: ${currentItem}`); // Thông báo mật khẩu đã được đặt
    } else if (modalType === "setFilePassword") {
      // Nếu modal là để đặt mật khẩu cho file
      handleSetFilePassword(currentItem, passwordInput);
      toast(`Password set for file: ${currentItem}`); // Thông báo mật khẩu đã được đặt
    } else if (modalType === "file") {
      // Kiểm tra mật khẩu cho File
      const currentPassword = filePasswords[`${activeFolder}/${currentItem}`];
      
      if (currentPassword === passwordInput) {
        // Mật khẩu đúng -> thực hiện hành động với File (tải xuống hoặc xóa)
        handleFileAction("download", { name: currentItem }); // Thay đổi "download" thành "delete" nếu muốn xóa
      } else {
        alert("Wrong file password!");
      }
    }
    
    closeModal();
  };
  
  const setFolderPassword = (folderName, password) => {
    setFolderPasswords((prevPasswords) => ({
      ...prevPasswords,
      [folderName]: password,
    }));
  };
  

  const closeModal = () => {
    setShowPasswordModal(false);
    setPasswordInput(""); // Reset input
  };
  
  const checkPassword = (type, name) => {
    const requiredPassword = type === "folder" ? folderPasswords[name] : filePasswords[name];
    if (!requiredPassword) return true; // Không có mật khẩu thì cho qua
  
    setPasswordPrompt({ isVisible: true, type, name }); // Mở modal nhập mật khẩu
    return false; // Tạm thời trả về false để chờ mật khẩu từ modal
  };

  const handlePasswordSubmit = () => {
    const { type, name } = passwordPrompt;
    const requiredPassword = type === "folder" ? folderPasswords[name] : filePasswords[name];
  
    if (enteredPassword === requiredPassword) {
      setPasswordPrompt({ isVisible: false, type: "", name: "" });
      setEnteredPassword(""); // Clear input
      return true; // Trả về true khi mật khẩu đúng
    } else {
      toast("Incorrect password.");
      return false;
    }
  };

  const handleFolderAction = (actionType) => {
    const folderName = activeFolder;
    const folderHasPassword = folderPasswords[folderName]; // Kiểm tra thư mục có mật khẩu hay không
  
    if (actionType === "loadFiles") {
      if (folderHasPassword && !activeFolder) {
        // Chỉ hiển thị modal yêu cầu mật khẩu nếu folder chưa được mở
        setModalType("folder");
        setCurrentItem(folderName); 
        setShowPasswordModal(true); 
      } else {
        // Nếu không có mật khẩu hoặc đã nhập đúng, tải file
        loadUserFiles(folderName);
      }
    } 
  };
  
  const handleFileAction = async (action, file) => {
    // Kiểm tra nếu file có mật khẩu
    const hasPassword = filePasswords[file.name]; // Giả định filePasswords là nơi lưu trữ mật khẩu của file
  
    if (hasPassword) {
      // Nếu file có mật khẩu, yêu cầu người dùng nhập mật khẩu
      const password = prompt("Enter password for the file:"); // Có thể thay bằng modal
      if (password !== filePasswords[file.name]) {
        toast("Incorrect password.");
        return; // Ngừng thực hiện nếu mật khẩu sai
      }
    }
  
    // Nếu mật khẩu đúng hoặc file không có mật khẩu, thực hiện hành động
    if (action === "download") {
      const link = document.createElement("a");
      link.href = file.downloadURL;
      link.download = file.name;
      link.click();
    } else if (action === "delete") {
      handleDelete(file);
    }
  };
  
  

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="w-43 bg-gray-800 text-white p-4">
        <h2 className="text-2xl font-bold mb-4 mt-2 ml-3">All Folder</h2>
        <ul>
          {folders
            .filter(folder => folder !== "trash") // Ẩn thư mục có tên là "trash"
            .map((folder) => (
              <li
                key={folder}
                className={`p-2 cursor-pointer ${activeFolder === folder ? "bg-gray-700" : ""}`}
                onClick={() => {
                  if (folderPasswords[folder]) {
                    setCurrentItem(folder);
                    setModalType("folder");
                    setShowPasswordModal(true);
                  } else {
                    setActiveFolder(folder);
                    handleFolderAction("loadFiles");
                  }
                }}
              >
                <FaFolder className="inline mr-2" /> {folder}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Ngăn không click vào folder
                    handleSetFolderPassword(folder);
                  }}
                  className="ml-2 text-yellow-300"
                >
                  <FaLock />
                </button>
              </li>
            ))}
        </ul>
        <button
          onClick={() => setFolderNamePrompt({ isVisible: true, folderName: "" })}
          className="bg-green-500 text-white px-3 py-1 rounded"
        >
          <FaPlus className="inline mr-1" /> Create Folder
        </button>
      </div>

      {/* Modal nhập mật khẩu */}
      {showPasswordModal && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "15%",
            zIndex: 1000,
            backgroundColor: "white",
            padding: "10px",
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
            borderRadius: "8px",
            width: "200px",
          }}
          className="flex flex-col items-center"
        >
          <h3 className="text-sm font-bold mb-2">
            Enter Password for {modalType === "folder" ? "Folder" : "File"} "{currentItem}"
          </h3>
          <input
            type="password"
            placeholder="Enter password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="p-2 border border-gray-300 rounded w-full mb-2"
          />
          <div className="flex justify-between w-full">
            <button onClick={closeModal} className="bg-gray-500 text-white px-3 py-1 rounded">
              Cancel
            </button>
            <button onClick={handleModalSave} className="bg-blue-500 text-white px-3 py-1 rounded">
              Save
            </button>
          </div>
        </div>
      )}

      {/* Modal tạo folder */}
      {folderNamePrompt.isVisible && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "15%",
            zIndex: 1000,
            backgroundColor: "white",
            padding: "10px",
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
            borderRadius: "8px",
            width: "200px",
          }}
          className="flex flex-col items-center"
        >
          <h3 className="text-sm font-bold mb-2">Create Folder</h3>
          <input
            type="text"
            value={folderNamePrompt.folderName}
            onChange={(e) => setFolderNamePrompt({ ...folderNamePrompt, folderName: e.target.value })}
            placeholder="Enter folder name"
            className="p-2 border border-gray-300 rounded w-full mb-2"
          />
          <div className="flex justify-between w-full">
            <button
              onClick={() => setFolderNamePrompt({ isVisible: false, folderName: "" })}
              className="bg-gray-500 text-white px-3 py-1 rounded"
            >
              Cancel
            </button>
            <button onClick={handleCreateFolder} className="bg-blue-500 text-white px-3 py-1 rounded">
              Create
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center bg-white p-2 rounded shadow mb-4">
          <span className="font-bold">{`StoredSecure/${auth.currentUser ? auth.currentUser.uid : ""}/${activeFolder}`}</span>
        </div>

        <div className="flex items-center mb-4">
          <FaSearch className="mr-2 text-gray-500" />
          <input
            type="text"
            placeholder="Search files and folders"
            value={searchTerm}
            onChange={handleSearchChange}
            className="p-2 border border-gray-300 rounded w-full"
          />
        </div>

        <div className="bg-gray-200 p-2 rounded mb-4 flex space-x-2">
          <button onClick={handleFileUpload} className="bg-blue-500 text-white px-3 py-1 rounded">
            <FaUpload className="inline mr-1" /> Upload
          </button>
          <button onClick={() => handleFolderAction("delete")} className="bg-red-500 text-white px-3 py-1 rounded">
            <FaTrash className="inline mr-1" /> Delete
          </button>
          <button onClick={handleZipDownload} className="bg-purple-500 text-white px-3 py-1 rounded">
            Download as ZIP
          </button>
        </div>

        <h3 className="text-xl font-bold mb-2">Files and Folders</h3>
        <div className="bg-white p-4 rounded shadow">
          {filteredFiles.length === 0 ? (
            <p>No files found.</p>
          ) : (
            <ul>
              {filteredFiles.map((file) => (
                <li key={file.name} className="flex justify-between items-center border-b py-2">
                  <span className="text-lg">{file.name}</span>
                  <div className="flex items-center">
                    <span className="text-gray-500 text-sm">Size: {(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    <span className="text-gray-500 text-sm ml-4">
                      Uploaded: {new Date(file.updated).toLocaleString()}
                    </span>
                    <button onClick={() => handleFileAction("download", file)} className="ml-4 p-1 bg-blue-500 text-white rounded">
                      Download
                    </button>
                    <button onClick={() => handleFileAction("delete", file)} className="ml-2 p-1 bg-red-500 text-white rounded">
                      Delete
                    </button>
                    <button onClick={() => handleCopy(file)} className="ml-2 p-1 bg-yellow-500 text-white rounded">
                      Copy
                    </button>
                    <button onClick={() => handleSetFilePassword(file)} className="ml-2 p-1 bg-yellow-500 text-white rounded">
                      <FaLock />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <h3 className="text-xl font-bold mt-8">Upload a File</h3>
        <div
          className={`p-8 bg-white border-dashed border-4 rounded-lg shadow-lg transition-all duration-300 ${dragging ? "border-blue-600 bg-blue-50" : "border-gray-400"}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input type="file" onChange={(e) => setFile(e.target.files[0])} className="hidden" id="file-upload" />
          <label
            htmlFor="file-upload"
            className="cursor-pointer bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200 mb-4 flex items-center justify-center text-lg"
          >
            <FaUpload className="inline mr-2" /> Chọn File
          </label>

          <p className="text-gray-600 text-center mt-3 text-lg">
            Kéo và thả file vào đây hoặc nhấn nút trên để tải lên.
          </p>
          {dragging && (
            <p className="text-blue-600 text-center mt-2 font-semibold text-lg">Thả file ở đây!</p>
          )}
        </div>
      </div>

      <button onClick={handleSignOut} className="p-2 bg-red-500 text-white rounded absolute top-4 right-4">
        <FaSignOutAlt className="inline mr-2" /> Sign Out
      </button>
      <ToastContainer />
    </div>
  );
};

export default StoredSecure;