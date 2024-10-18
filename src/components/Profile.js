import { useState, useEffect } from "react";
import { auth, storage } from "../firebase";
import { ref, listAll, getMetadata, getDownloadURL } from "firebase/storage";
import { ToastContainer, toast } from 'react-toastify';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { format } from 'date-fns';
import 'react-toastify/dist/ReactToastify.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const UserProfile = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [storageUsed, setStorageUsed] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [fileList, setFileList] = useState([]);

  const totalStorageAllowed = 2 * 1024 * 1024 * 1024;

  useEffect(() => {
    if (auth.currentUser) {
      const { email, uid } = auth.currentUser;
      setUserInfo({ email, uid });
      calculateStorageUsage(uid);
      fetchFileList(uid);
    }
  }, []);

  const calculateStorageUsage = async (userId) => {
    try {
      const folderRef = ref(storage, `StoredSecure/${userId}/encrypted`);
      const fileList = await listAll(folderRef);

      let totalSize = 0;
      let totalCount = 0;

      const metadataPromises = fileList.items.map(async (item) => {
        const metadata = await getMetadata(item);
        totalSize += metadata.size;
        totalCount += 1;
      });

      await Promise.all(metadataPromises);

      setStorageUsed(totalSize);
      setFileCount(totalCount);

      if (totalSize / totalStorageAllowed >= 0.8) {
        toast.warn('Your storage is almost full!', { position: toast.POSITION.TOP_CENTER });
      }
    } catch (error) {
      console.error("Error calculating storage usage:", error);
    }
  };

  const fetchFileList = async (userId) => {
    try {
      const folderRef = ref(storage, `StoredSecure/${userId}/encrypted`);
      const fileList = await listAll(folderRef);

      const fileDetailsPromises = fileList.items.map(async (item) => {
        const metadata = await getMetadata(item);
        const uploadTime = new Date(metadata.timeCreated);
        return { name: item.name, url: await getDownloadURL(item), uploadTime };
      });

      const fileDetails = await Promise.all(fileDetailsPromises);
      setFileList(fileDetails);
    } catch (error) {
      console.error("Error fetching file list:", error);
    }
  };

  const formatSize = (sizeInBytes) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    const kbSize = sizeInBytes / 1024;
    if (kbSize < 1024) return `${kbSize.toFixed(2)} KB`;
    const mbSize = kbSize / 1024;
    if (mbSize < 1024) return `${mbSize.toFixed(2)} MB`;
    const gbSize = mbSize / 1024;
    return `${gbSize.toFixed(2)} GB`;
  };

  const data = {
    labels: ['Storage Used', 'Remaining'],
    datasets: [{
      label: 'Storage in GB',
      data: [storageUsed / (1024 * 1024 * 1024), (totalStorageAllowed - storageUsed) / (1024 * 1024 * 1024)],
      backgroundColor: ['rgba(0, 255, 255, 0.2)', 'rgba(255, 255, 0, 0.2)'],
      borderColor: ['rgba(0, 255, 255, 1)', 'rgba(255, 255, 0, 1)'],
      borderWidth: 1
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Storage Usage (GB)' }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-800 to-cyan-700 text-white p-6">
      <h1 className="text-6xl font-extrabold mb-8 text-glow-neon">User Profile</h1>
      <div className="bg-gray-900 text-neon-blue p-5 rounded-lg shadow-lg w-full max-w-2xl flex flex-col items-start">
        {userInfo ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-neon-green">User Information</h2>
            <p><strong>Email:</strong> {userInfo.email}</p>
            <p><strong>User ID:</strong> {userInfo.uid}</p>

            <h2 className="text-2xl font-bold mt-6 mb-4 text-neon-green">Storage Usage</h2>
            <p><strong>Total Files:</strong> {fileCount}</p>
            <p><strong>Storage Used:</strong> {formatSize(storageUsed)}</p>

            <div className="mt-4 w-full">
              <h2 className="text-2xl font-bold mb-4 text-neon-green">Storage Overview</h2>
              <Bar data={data} options={options} />
            </div>

            {fileList.length > 0 && (
              <div className="mt-4 w-full">
                <h2 className="text-2xl font-bold mb-4 text-neon-green">Files Uploaded</h2>
                <ul>
                  {fileList.map((file, index) => (
                    <li key={index}>
                      <a href={file.url} download className="text-neon-blue underline">
                        {file.name}
                      </a>
                      <span className="text-gray-400 ml-2">
                        - Uploaded on {format(file.uploadTime, 'dd/MM/yyyy')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
