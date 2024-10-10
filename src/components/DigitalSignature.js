import React, { useState } from "react";
import forge from "node-forge";
import { ToastContainer, toast } from 'react-toastify'; // Import Toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for Toastify

const DigitalSignature = () => {
  const [message, setMessage] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [signature, setSignature] = useState("");

  // Tạo cặp khóa RSA
  const generateRSAKeys = () => {
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
    const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

    setPublicKey(publicKeyPem);
    setPrivateKey(privateKeyPem);
    toast.success("Cặp khóa RSA đã được tạo thành công!"); // Thông báo thành công
  };

  // Ký thông điệp
  const signMessage = () => {
    if (message && privateKey) {
      const privateKeyObj = forge.pki.privateKeyFromPem(privateKey);
      const md = forge.md.sha256.create();
      md.update(message, "utf8");
      const signatureBytes = privateKeyObj.sign(md);
      const encodedSignature = forge.util.encode64(signatureBytes);
      setSignature(encodedSignature);
      toast.success("Thông điệp đã được ký thành công!"); // Thông báo thành công
    } else {
      toast.error("Vui lòng nhập một thông điệp và cung cấp khóa riêng."); // Thông báo lỗi
    }
  };

  // Xác thực chữ ký
  const verifySignature = () => {
    if (signature && publicKey && message) {
      const publicKeyObj = forge.pki.publicKeyFromPem(publicKey);
      const md = forge.md.sha256.create();
      md.update(message, "utf8");
      
      // Giải mã chữ ký
      const decodedSignature = forge.util.decode64(signature);

      // Xác thực chữ ký
      const isValid = publicKeyObj.verify(md.digest().bytes(), decodedSignature);
      toast.success(isValid ? "Chữ ký hợp lệ!" : "Chữ ký không hợp lệ!"); // Thông báo xác thực
    } else {
      toast.error("Vui lòng nhập thông điệp, chữ ký và khóa công khai."); // Thông báo lỗi
    }
  };

  // Tải chữ ký xuống tệp
  const downloadSignature = () => {
    if (signature) {
      const content = `Thông điệp: ${message}\nChữ ký: ${signature}\nKhóa công khai: ${publicKey}`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = "signature.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Tệp chữ ký đã được tải xuống!"); // Thông báo tải xuống thành công
    } else {
      toast.error("Chưa có chữ ký để tải xuống."); // Thông báo lỗi
    }
  };

  // Chia sẻ qua email
  const shareByEmail = () => {
    if (signature) {
      const subject = "Chữ Ký Số Của Tôi";
      const body = `Thông điệp: ${message}\nChữ ký: ${signature}\nKhóa công khai: ${publicKey}`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      toast.success("Mở ứng dụng email để chia sẻ chữ ký!"); // Thông báo chia sẻ
    } else {
      toast.error("Chưa có chữ ký để chia sẻ."); // Thông báo lỗi
    }
  };

  return (
    <div className="flex flex-col items-center justify-start p-6 bg-gray-50">
      <h1 className="text-5xl font-extrabold mb-8 text-gray-800">Digital Signature</h1>

      <div className="mt-6 w-full max-w-lg">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nhập thông điệp để ký"
          className="w-full h-32 bg-gray-800 text-white p-4 rounded"
        />

        <button onClick={generateRSAKeys} className="mt-4 p-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded w-full">
          Tạo Cặp Khóa RSA
        </button>

        {publicKey && (
          <div className="mt-6 w-full">
            <h3 className="text-xl mb-2">Khóa Công Khai:</h3>
            <textarea className="w-full h-32 bg-gray-900 text-white p-4 rounded" readOnly value={publicKey} />
          </div>
        )}

        {privateKey && (
          <div className="mt-6 w-full">
            <h3 className="text-xl mb-2">Khóa Riêng:</h3>
            <textarea className="w-full h-32 bg-gray-900 text-white p-4 rounded" readOnly value={privateKey} />
          </div>
        )}

        <button onClick={signMessage} className="mt-4 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded w-full">
          Ký Thông Điệp
        </button>

        {signature && (
          <div className="mt-6 w-full">
            <h3 className="text-xl mb-2">Chữ Ký:</h3>
            <textarea className="w-full h-32 bg-gray-900 text-white p-4 rounded" readOnly value={signature} />
          </div>
        )}

        <button onClick={verifySignature} className="mt-4 p-3 bg-green-600 hover:bg-green-700 text-white rounded w-full">
          Xác Thực Chữ Ký
        </button>

        <button onClick={downloadSignature} className="mt-4 p-3 bg-orange-600 hover:bg-orange-700 text-white rounded w-full">
          Tải Xuống Chữ Ký
        </button>

        <button onClick={shareByEmail} className="mt-4 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded w-full">
          Chia Sẻ Qua Email
        </button>
      </div>

      <ToastContainer /> {/* Thêm ToastContainer để hiển thị thông báo */}
    </div>
  );
};

export default DigitalSignature;

// Thông báo React Toastify