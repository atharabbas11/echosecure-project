import React from 'react';

const GroupDeleteConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null; // Don't render if not open

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-xl font-bold text-red-600">⚠️ Warning!</h2>
        <p className="mt-2 text-gray-700">Are you sure you want to delete this group? This action cannot be undone.</p>
        <div className="mt-4 flex justify-end space-x-4">
          <button className="bg-gray-300 text-black py-2 px-4 rounded-md" onClick={onClose}>Cancel</button>
          <button className="bg-red-600 text-white py-2 px-4 rounded-md" onClick={onConfirm}>Yes, Delete</button>
        </div>
      </div>
    </div>
  );
};

export default GroupDeleteConfirmationModal;
