import { useState } from 'react';
import { useSocket } from '../context/SocketContext';

const FileUpload = ({ roomId }) => {
  const socket = useSocket();
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFile({
          name: selectedFile.name,
          type: selectedFile.type,
          data: event.target.result
        });
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = () => {
    if (file) {
      socket.emit('file_upload', {
        file: file.data,
        fileName: file.name,
        fileType: file.type,
        roomId
      });
      setFile(null);
    }
  };

  return (
    <div className="file-upload">
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!file}>Upload</button>
    </div>
  );
};

export default FileUpload;