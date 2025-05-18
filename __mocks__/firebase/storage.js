

console.log('[MOCK] Usando mock para firebase/storage');

let uploadBytesArgs = [];

const mockRef = { name: 'mockFile.pdf', fullPath: 'mock/path/mockFile.pdf' };
const mockSnapshot = { ref: mockRef };
const mockDownloadURL = 'https://mock.firebase.storage.url/mockFile.pdf';

const getStorage = jest.fn(() => {
  return { app: { name: 'mockApp' } };
});

const ref = jest.fn((storage, path) => {
  return { 
    name: path.split('/').pop(),
    fullPath: path,
    path: path
  };
});

const uploadBytes = jest.fn((fileRef, buffer, metadata) => {
  uploadBytesArgs.push([buffer, fileRef, metadata]); 
  return Promise.resolve({ ...mockSnapshot, ref: fileRef });
});

const getDownloadURL = jest.fn((fileRef) => {
  return Promise.resolve(mockDownloadURL);
});

const getUploadBytesArgs = () => uploadBytesArgs;

const resetUploadBytesArgs = () => {
  uploadBytesArgs = [];
};

module.exports = {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  getUploadBytesArgs,
  resetUploadBytesArgs
}; 