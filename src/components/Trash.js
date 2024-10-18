import { useState, useEffect } from "react";
import { auth, storage } from "../firebase"; // Firebase imports
import { ref, listAll, getMetadata, getDownloadURL, deleteObject, uploadBytes } from "firebase/storage";
import { format } from 'date-fns';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Trash = () => {
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    if (auth.currentUser) {
      const { uid } = auth.currentUser;
      fetchDeletedFileList(uid);
    }
  }, []);

  // Lấy danh sách file đã xóa
  const fetchDeletedFileList = async (userId) => {
    try {
      const trashRef = ref(storage, `StoredSecure/${userId}/trash`);
      const fileList = await listAll(trashRef);

      const fileDetailsPromises = fileList.items.map(async (item) => {
        const metadata = await getMetadata(item);
        const uploadTime = new Date(metadata.timeCreated);
        return { name: item.name, url: await getDownloadURL(item), uploadTime, fullPath: item.fullPath };
      });

      const fileDetails = await Promise.all(fileDetailsPromises);
      setFileList(fileDetails);
    } catch (error) {
      console.error("Error fetching deleted files:", error);
    }
  };

  // Khôi phục file từ Trash
  const restoreFile = async (file) => {
    try {
      const originalPath = file.fullPath.replace('/trash/', '/');
      const oldRef = ref(storage, file.fullPath);
      const newRef = ref(storage, originalPath);
      const downloadURL = await getDownloadURL(oldRef);
      const blob = await fetch(downloadURL).then((response) => response.blob());
      await uploadBytes(newRef, blob);
      await deleteObject(oldRef);
      setFileList(fileList.filter(f => f.fullPath !== file.fullPath));
      toast.success(`${file.name} has been restored!`);
    } catch (error) {
      console.error("Error restoring file:", error.message);
      toast.error(`Failed to restore ${file.name}: ${error.message}`);
    }
  };

  // Xóa file vĩnh viễn
  const permanentlyDeleteFile = async (file) => {
    try {
      const fileRef = ref(storage, file.fullPath);
      await deleteObject(fileRef);
      setFileList(fileList.filter(f => f.fullPath !== file.fullPath));
      toast.success(`${file.name} has been permanently deleted!`);
    } catch (error) {
      console.error("Error deleting file permanently:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-black to-blue-900 text-neon-green p-8">
  <h1 className="text-6xl font-extrabold mb-10 text-neon-green neon-glow-title">
    Cyber Trash Bin
  </h1>
  <div className="bg-gradient-to-b from-gray-900 to-black p-10 rounded-xl neon-glow-box shadow-xl w-full max-w-3xl flex flex-col items-start">
    <h2 className="text-3xl font-bold mb-6 text-neon-blue neon-glow-text">
      Files in Trash
    </h2>

    {fileList.length > 0 ? (
      <ul className="w-full">
        {fileList.map((file, index) => (
          <li key={index} className="mb-6 flex flex-col bg-gray-800 p-4 rounded-lg hover:neon-glow-box-hover transition-all duration-500">
            <div className="flex justify-between items-center">
              <a
                href={file.url}
                download
                className="text-neon-blue underline hover:text-neon-green transition-all duration-300"
              >
                {file.name}
              </a>
              <span className="text-gray-500 ml-2 text-sm">
                - Uploaded on {format(file.uploadTime, "dd/MM/yyyy")}
              </span>
            </div>

            <div className="mt-4 flex space-x-6 justify-end">
              <button
                className="bg-neon-blue text-white px-6 py-3 rounded-lg shadow-neon hover:bg-neon-green hover:text-gray-900 transition-all duration-500 hover:shadow-[0_0_25px_15px_rgba(57,255,20,0.9),0_0_50px_40px_rgba(57,255,20,0.5)]"
                onClick={() => restoreFile(file)}
              >
                Restore
              </button>
              <button
                className="bg-neon-red text-white px-6 py-3 rounded-lg shadow-neon hover:bg-gray-900 hover:text-neon-red transition-all duration-500 hover:shadow-[0_0_25px_15px_rgba(255,0,0,0.9),0_0_50px_40px_rgba(255,0,0,0.5)]"
                onClick={() => permanentlyDeleteFile(file)}
              >
                Permanently Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-neon-red text-2xl neon-glow-text">
        No files in trash.
      </p>
    )}
  </div>
  <ToastContainer />
</div>

  );
};

export default Trash;
