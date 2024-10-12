import { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from "react-router-dom";
import { FaHome, FaFolder, FaTrash, FaUserShield, FaFileAlt, FaSignal, FaBars, FaChevronLeft, FaNetworkWired } from "react-icons/fa";
import axios from 'axios'; // Import axios for IP fetching
import Home from './components/Home';
import StoredSecure from './components/StoredSecure';
import FileManager from './components/FileManager';
import Profile from './components/Profile';
import DigitalSignature from './components/DigitalSignature';
import Login from './components/Login';
import { auth, storage } from './firebase'; 
import { ref, listAll, getMetadata } from "firebase/storage";

const App = () => {
  const [user, setUser] = useState(null);
  const [storageUsed, setStorageUsed] = useState(0); 
  const [fileCount, setFileCount] = useState(0); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkQualityColor, setNetworkQualityColor] = useState('green');
  const [fps, setFps] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentIP, setCurrentIP] = useState(''); // State to store IP address
  const [isIPSwitched, setIsIPSwitched] = useState(false); // Toggle state for switching IP

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser); 
      if (currentUser) {
        calculateStorageUsage(currentUser.uid);
      }
    });
    return () => unsubscribe();
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
    } catch (error) {
      console.error("Error calculating storage usage:", error);
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

  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.connection) {
        const speed = navigator.connection.downlink;

        if (speed > 1.5) {
          setNetworkQualityColor('green');
        } else if (speed > 0.5) {
          setNetworkQualityColor('yellow');
        } else {
          setNetworkQualityColor('red');
        }
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    if (navigator.connection) {
      updateNetworkStatus();
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  useEffect(() => {
    const fpsInterval = setInterval(() => {
      setFps(Math.floor(Math.random() * 60)); 
    }, 1000);

    return () => clearInterval(fpsInterval);
  }, []);

  useEffect(() => {
    // Fetch the IP address when the component mounts
    fetchIPAddress();
  }, [isIPSwitched]); // Refetch the IP when the IP switch toggle changes

  const fetchIPAddress = async () => {
    try {
      const response = await axios.get('https://api.ipify.org?format=json');
      setCurrentIP(response.data.ip);
    } catch (error) {
      console.error("Error fetching IP address:", error);
    }
  };

  const handleLogout = () => {
    auth.signOut(); 
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleIPSwitch = () => {
    // Simulate IP switching by toggling between fetched and dummy IPs
    setIsIPSwitched(!isIPSwitched);
  };

  return (
    <Router>
      <div className="flex h-screen m-0">
        {/* Button to toggle sidebar */}
        <button 
          onClick={toggleSidebar} 
          className="p-1 text-white bg-gray-800 rounded-md fixed top-7 left-25 z-10"
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? <FaChevronLeft /> : <FaBars />}
        </button>

        {isSidebarOpen && (
          <nav className="w-64 bg-gray-800 text-white h-full p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Khoa Secure</h2>
            </div>

            <ul className="space-y-6">
              <li>
                <Link to="/" className="flex items-center text-gray-300 hover:bg-gray-700 p-3 rounded">
                  <FaHome className="mr-3" /> Home
                </Link>
              </li>
              <li>
                <Link to="/file-manager" className="flex items-center text-gray-300 hover:bg-gray-700 p-3 rounded">
                  <FaFolder className="mr-3" /> File Manager
                </Link>
              </li>
              <li>
                <Link to="/profile" className="flex items-center text-gray-300 hover:bg-gray-700 p-3 rounded">
                  <FaUserShield className="mr-3" /> Profile
                </Link>
              </li>
              <li>
                <Link to="/digital-signature" className="flex items-center text-gray-300 hover:bg-gray-700 p-3 rounded">
                  <FaFileAlt className="mr-3" /> Digital Signature
                </Link>
              </li>
              <li>
                <Link to="/deleted" className="flex items-center text-gray-300 hover:bg-gray-700 p-3 rounded">
                  <FaTrash className="mr-3" /> Deleted Files
                </Link>
              </li>
            </ul>

            <div className="mt-auto pt-4 border-t border-gray-700 flex flex-col items-center">
              <div className="bg-gray-800 rounded-lg p-4 shadow-md w-full max-w-sm flex flex-col items-center">
                <h3 className="text-lg font-semibold mb-2">Storage Information</h3>
                <div className="flex items-center mb-4">
                  <div className="flex items-center mr-4">
                    <i className="fas fa-hdd text-blue-400 mr-2"></i>
                    <span className="text-sm">Used: {formatSize(storageUsed)}</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-folder text-green-400 mr-2"></i>
                    <span className="text-sm">Total Files: {fileCount}</span>
                  </div>
                </div>
                <div className="bg-gray-700 rounded-full h-2 w-full">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(storageUsed / (2 * 1024 * 1024 * 1024)) * 100}%` }} // Assuming total storage is 2GB
                  ></div>
                </div>
                <span className="text-xs text-gray-400 mt-2">{(storageUsed / (1024 * 1024)).toFixed(2)} MB / 2048 MB</span>
              </div>
            </div>

            {user && (
              <div className="mt-3">
                <button onClick={handleLogout} className="bg-red-600 p-3 rounded text-white w-full hover:bg-red-700">
                  Logout
                </button>
              </div>
            )}

            <div className="mt-3 text-sm flex items-center" style={{ color: networkQualityColor }}>
              <FaSignal className={`mr-2 text-${networkQualityColor}-500`} />
              <p>{isOnline ? 'Online' : 'Offline'}</p>
            </div>

            <div className="mt-3 text-sm text-gray-300">
              <p>FPS: {fps}</p>
            </div>

            {/* Display current IP address */}
            <div className="mt-4 text-sm text-gray-300">
              <FaNetworkWired className="mr-2 text-blue-500" />
              <p>IP Address: {currentIP}</p>
              <button 
                onClick={handleIPSwitch} 
                className="bg-blue-500 p-2 rounded text-white w-full mt-2 hover:bg-blue-700">
                Switch IP
              </button>
            </div>
          </nav>
        )}

        <div className={`flex-1 bg-gray-50 p-0 overflow-y-auto ${isSidebarOpen ? '' : 'ml-0'}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/file-manager" element={user ? <FileManager /> : <Navigate to="/login" />}/>
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
            <Route path="/digital-signature" element={<DigitalSignature />} />
            <Route path="/deleted" element={user ? <StoredSecure /> : <Navigate to="/login" />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;


