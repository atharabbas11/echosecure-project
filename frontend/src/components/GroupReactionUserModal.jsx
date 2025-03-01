import React, { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

const GroupReactionUserModal = ({ reactions, onClose, messageId, currentUserId }) => {
  const [activeEmoji, setActiveEmoji] = useState(Object.keys(reactions)[0]); // Default to first emoji
  const modalRef = useRef(null);
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  const { authUser } = useAuthStore();

  // Debugging: Log reactions and currentUserId
  useEffect(() => {
    // console.log("Reactions:", reactions);
    // console.log("Current User ID:", currentUserId);
  }, [reactions, currentUserId]);

  // Close modal if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [onClose]);

  // Function to remove a reaction for a specific user
  const handleRemoveReaction = async (emoji, userId) => {
    if (userId !== authUser._id) {
      alert("You can only remove your own reactions.");
      return;
    }

    try {
      // Call the API to remove the reaction
      await axiosInstance.post(`/groups/messages/group/${messageId}/remove-reaction`, { emoji, userId: authUser._id});

      // Update the local state to reflect the removal
      reactions[emoji] = reactions[emoji].filter((user) => user._id !== userId);

      // If the active emoji has no more users, switch to the next available emoji
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
        const remainingEmojis = Object.keys(reactions);
        setActiveEmoji(remainingEmojis.length > 0 ? remainingEmojis[0] : null);
      }

      // Optionally, you can trigger a state update or refetch reactions here
    } catch (error) {
      // console.error("Failed to remove reaction:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className={`bg-white rounded-lg shadow-lg max-w-md w-full ${isMobile ? "p-4" : "p-6"}`}>
        <h2 className="text-xl font-bold mb-4">Reactions</h2>

        {/* Emoji Bar - Always show all emojis */}
        <div className="flex space-x-2 mb-4 overflow-x-auto">
          {Object.keys(reactions).map((emoji) => (
            <button
              key={emoji}
              onClick={() => setActiveEmoji(emoji)}
              className={`text-2xl p-2 rounded-full ${activeEmoji === emoji ? "bg-gray-200" : "bg-transparent"} hover:bg-gray-100 transition-colors duration-200`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Users List - Show users only for the selected emoji */}
        <ul className="max-h-64 overflow-y-auto">
          {(reactions[activeEmoji] || []).map((user, index) => (
            <li key={index} className="flex items-center justify-between space-x-2 mb-2 p-2">
              <div className="flex items-center space-x-2">
                <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="w-8 h-8 rounded-full" />
                <span>{user.fullName}</span>
              </div>
              {user._id === authUser._id && ( // Now user._id is defined
                <button
                  onClick={() => handleRemoveReaction(activeEmoji, user._id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* Close Button */}
        <button onClick={onClose} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full">
          Close
        </button>
      </div>
    </div>
  );
};

export default GroupReactionUserModal;