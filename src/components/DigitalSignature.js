import React, { useState } from "react";
import forge from "node-forge";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DigitalSignature = () => {
  const [message, setMessage] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [signature, setSignature] = useState("");

  const [verifyMessage, setVerifyMessage] = useState("");  // New state for verification message
  const [verifyPublicKey, setVerifyPublicKey] = useState(""); // New state for verification public key
  const [verifySignature, setVerifySignature] = useState(""); // New state for verification signature

  // Generate RSA key pair
  const generateRSAKeys = () => {
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
    const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

    setPublicKey(publicKeyPem);
    setPrivateKey(privateKeyPem);
    toast.success("RSA Key pair generated successfully!");
  };

  // Sign the message
  const signMessage = () => {
    if (message && privateKey) {
      const privateKeyObj = forge.pki.privateKeyFromPem(privateKey);
      const md = forge.md.sha256.create();
      md.update(message, "utf8");
      const signatureBytes = privateKeyObj.sign(md);
      const encodedSignature = forge.util.encode64(signatureBytes);
      setSignature(encodedSignature);
      toast.success("Message signed successfully!");
    } else {
      toast.error("Please enter a message and provide the private key.");
    }
  };

  // Verify the signature
  const verifySignatureFunc = () => {
    if (verifySignature && verifyPublicKey && verifyMessage) {
      const publicKeyObj = forge.pki.publicKeyFromPem(verifyPublicKey);
      const md = forge.md.sha256.create();
      md.update(verifyMessage, "utf8");

      const decodedSignature = forge.util.decode64(verifySignature);

      const isValid = publicKeyObj.verify(md.digest().bytes(), decodedSignature);
      toast.success(isValid ? "Signature is valid!" : "Signature is not valid!");
    } else {
      toast.error("Please enter message, signature, and public key for verification.");
    }
  };

  const downloadSignature = () => {
    if (signature) {
      const content = `Message: ${message}\nSignature: ${signature}\nPublic Key: ${publicKey}`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "signature.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Signature file downloaded!");
    } else {
      toast.error("No signature to download.");
    }
  };

  const shareByEmail = () => {
    if (signature) {
      const subject = "My Digital Signature";
      const body = `Message: ${message}\nSignature: ${signature}\nPublic Key: ${publicKey}`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      toast.success("Opening email application to share signature!");
    } else {
      toast.error("No signature to share.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-start p-6 bg-gray-50">
      <h1 className="text-5xl font-extrabold mb-8 text-gray-800">Digital Signature</h1>

      <div className="mt-6 w-full max-w-lg">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter message to sign"
          className="w-full h-32 bg-gray-800 text-white p-4 rounded"
        />

        <button onClick={generateRSAKeys} className="mt-4 p-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded w-full">
          Generate RSA Key Pair
        </button>

        {publicKey && (
          <div className="mt-6 w-full">
            <h3 className="text-xl mb-2">Public Key:</h3>
            <textarea className="w-full h-32 bg-gray-900 text-white p-4 rounded" readOnly value={publicKey} />
          </div>
        )}

        {privateKey && (
          <div className="mt-6 w-full">
            <h3 className="text-xl mb-2">Private Key:</h3>
            <textarea className="w-full h-32 bg-gray-900 text-white p-4 rounded" readOnly value={privateKey} />
          </div>
        )}

        <button onClick={signMessage} className="mt-4 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded w-full">
          Sign Message
        </button>

        {signature && (
          <div className="mt-6 w-full">
            <h3 className="text-xl mb-2">Signature:</h3>
            <textarea className="w-full h-32 bg-gray-900 text-white p-4 rounded" readOnly value={signature} />
          </div>
        )}

        <button onClick={downloadSignature} className="mt-4 p-3 bg-orange-600 hover:bg-orange-700 text-white rounded w-full">
          Download Signature
        </button>

        <button onClick={shareByEmail} className="mt-4 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded w-full">
          Share via Email
        </button>

        {/* New Section for Signature Verification */}
        <div className="mt-6">
          <h2 className="text-2xl font-bold">Verify Signature</h2>
          <textarea
            value={verifyMessage}
            onChange={(e) => setVerifyMessage(e.target.value)}
            placeholder="Enter message to verify"
            className="w-full h-20 bg-gray-800 text-white p-4 rounded mt-4"
          />
          <textarea
            value={verifySignature}
            onChange={(e) => setVerifySignature(e.target.value)}
            placeholder="Enter signature to verify"
            className="w-full h-15 bg-gray-800 text-white p-4 rounded mt-3"
          />
          <textarea
            value={verifyPublicKey}
            onChange={(e) => setVerifyPublicKey(e.target.value)}
            placeholder="Enter public key to verify"
            className="w-full h-15 bg-gray-800 text-white p-4 rounded mt-3"
          />

          <button onClick={verifySignatureFunc} className="mt-4 p-3 bg-green-600 hover:bg-green-700 text-white rounded w-full">
            Verify Signature
          </button>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default DigitalSignature;
