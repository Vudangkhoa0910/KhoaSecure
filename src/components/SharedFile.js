import React, { useEffect, useState } from 'react';
import { db } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const SharedFile = ({ match }) => {
  const [fileData, setFileData] = useState(null);
  
  useEffect(() => {
    const fetchSharedFile = async () => {
      const docRef = doc(db, "sharedLinks", match.params.id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const { fileData, expiry, accessRestricted } = docSnap.data();
        
        if (new Date() < expiry.toDate()) {
          setFileData(fileData); // Giải mã file nếu còn hiệu lực
        } else {
          alert("Liên kết đã hết hạn!");
        }
      } else {
        alert("Không tìm thấy file chia sẻ.");
      }
    };

    fetchSharedFile();
  }, [match.params.id]);

  return (
    <div>
      {fileData ? (
        <textarea value={fileData} readOnly />
      ) : (
        <p>Đang tải...</p>
      )}
    </div>
  );
};

export default SharedFile;
