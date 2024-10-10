import { useState, useEffect } from "react";
import { auth, storage } from "../firebase"; // Firebase imports
import { ref, listAll, getMetadata } from "firebase/storage";
import { ToastContainer, toast } from 'react-toastify'; // Import ToastContainer và toast
import 'react-toastify/dist/ReactToastify.css'; 

const UserProfile = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [storageUsed, setStorageUsed] = useState(0); // Dung lượng đã sử dụng
  const [fileCount, setFileCount] = useState(0); // Số file đã tải lên

  useEffect(() => {
    // Lấy thông tin người dùng
    if (auth.currentUser) {
      const { email, uid } = auth.currentUser;
      setUserInfo({ email, uid });
      calculateStorageUsage(uid); // Gọi hàm tính dung lượng lưu trữ
    }
  }, []);

  const calculateStorageUsage = async (userId) => {
    try {
      const folderRef = ref(storage, `StoredSecure/${userId}/encrypted`);
      const fileList = await listAll(folderRef);

      let totalSize = 0;
      let totalCount = 0;

      // Duyệt qua tất cả file để lấy thông tin metadata (kích thước file)
      const metadataPromises = fileList.items.map(async (item) => {
        const metadata = await getMetadata(item);
        totalSize += metadata.size; // Thêm kích thước file vào tổng số
        totalCount += 1; // Đếm số file
      });

      // Đợi tất cả các promise hoàn thành
      await Promise.all(metadataPromises);

      // Cập nhật trạng thái về dung lượng và số file
      setStorageUsed(totalSize);
      setFileCount(totalCount);
    } catch (error) {
      console.error("Error calculating storage usage:", error);
    }
  };

  // Hàm format dung lượng file thành MB/GB
  const formatSize = (sizeInBytes) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    const kbSize = sizeInBytes / 1024;
    if (kbSize < 1024) return `${kbSize.toFixed(2)} KB`;
    const mbSize = kbSize / 1024;
    if (mbSize < 1024) return `${mbSize.toFixed(2)} MB`;
    const gbSize = mbSize / 1024;
    return `${gbSize.toFixed(2)} GB`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 to-blue-800 text-white p-6">
      <h1 className="text-5xl font-extrabold mb-8">User Profile</h1>
      <div className="bg-white text-gray-800 p-8 rounded-lg shadow-lg w-full max-w-xl flex flex-col items-start"> 
        {/* Hiển thị thông tin cơ bản người dùng */}
        {userInfo ? (
          <>
            <h2 className="text-2xl font-bold mb-4">User Information</h2>
            <p><strong>Email:</strong> {userInfo.email}</p>
            <p><strong>User ID:</strong> {userInfo.uid}</p>

            <h2 className="text-2xl font-bold mt-6 mb-4">Storage Usage</h2>
            <p><strong>Total Files:</strong> {fileCount}</p>
            <p><strong>Storage Used:</strong> {formatSize(storageUsed)}</p>
          </>
        ) : (
          <p>Loading user information...</p>
        )}
      </div>
      <ToastContainer /> 
    </div>
  );
};

export default UserProfile;
