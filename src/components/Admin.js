// import React, { useEffect, useState } from 'react';
// import { getFirestore, collection, getDocs } from 'firebase/firestore';
// import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
// import { Bar } from 'react-chartjs-2';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
// } from 'chart.js';

// ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// const Admin = () => { 
//   const db = getFirestore();
//   const storage = getStorage();
  
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [userData, setUserData] = useState({ storageUsed: 0, totalStorage: 1000 }); // Set total storage as 1000MB or as needed

//   useEffect(() => {
//     const fetchUsers = async () => {
//       const userCollection = collection(db, 'users'); // Assuming you have a 'users' collection in Firestore
//       const userSnapshot = await getDocs(userCollection);
//       const userList = userSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
//       setUsers(userList);
//       setLoading(false);
//     };
//     fetchUsers();
//   }, [db]); // Added db to dependency array

//   const handleUserSelect = async (user) => {
//     setSelectedUser(user);
//     await loadUserData(user.uid);
//   };

//   const loadUserData = async (uid) => {
//     const userStorageRef = ref(storage, `StoredSecure/${uid}`);
//     const files = await listAll(userStorageRef);
    
//     let totalSize = 0;
//     await Promise.all(
//       files.items.map(async (item) => {
//         const url = await getDownloadURL(item);
//         const metadata = await item.getMetadata();
//         totalSize += metadata.size / (1024 * 1024); // Convert size to MB
//         // You can add logic here to store the URLs if needed
//       })
//     );
//     setUserData({ storageUsed: totalSize, totalStorage: 1000 }); // Update user data with storage used
//   };

//   const getUserDataForChart = () => {
//     if (selectedUser) {
//       return {
//         labels: ['Used Storage', 'Remaining Storage'],
//         datasets: [
//           {
//             label: 'Storage Usage (MB)',
//             data: [userData.storageUsed, userData.totalStorage - userData.storageUsed],
//             backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(75, 192, 192, 0.6)'],
//           },
//         ],
//       };
//     }
//     return null;
//   };

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
//       {loading ? (
//         <p>Loading users...</p>
//       ) : (
//         <div className="flex">
//           <div className="w-1/3 p-4">
//             <h2 className="text-2xl font-bold mb-4">User List</h2>
//             <ul className="bg-white rounded-lg shadow-md">
//               {users.map((user) => (
//                 <li
//                   key={user.id}
//                   onClick={() => handleUserSelect(user)}
//                   className={`p-4 cursor-pointer hover:bg-gray-200 ${
//                     selectedUser?.id === user.id ? 'bg-gray-300' : ''
//                   }`}
//                 >
//                   {user.email} - Used: {userData.storageUsed.toFixed(2)} MB
//                 </li>
//               ))}
//             </ul>
//           </div>

//           <div className="w-2/3 p-4">
//             {selectedUser ? (
//               <>
//                 <h2 className="text-2xl font-bold mb-4">User Details</h2>
//                 <p><strong>User ID:</strong> {selectedUser.uid}</p>
//                 <p><strong>Email:</strong> {selectedUser.email}</p>
//                 <p><strong>Storage Used:</strong> {userData.storageUsed.toFixed(2)} MB</p>
//                 <p><strong>Total Storage:</strong> {userData.totalStorage} MB</p>
//                 <h3 className="text-xl font-bold mb-2">Storage Chart</h3>
//                 <Bar data={getUserDataForChart()} options={{ responsive: true }} />
//               </>
//             ) : (
//               <p>Please select a user to see details.</p>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Admin;
