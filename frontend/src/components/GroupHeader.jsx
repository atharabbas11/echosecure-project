import { X, Clock } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import { useMediaQuery } from "react-responsive";

const GroupHeader = ({ onHeaderClick, onChatClose }) => {
  const { setExpiryTime, expiryTime, selectedGroup, setSelectedGroup } = useChatStore();
  const { authUser: user, isCheckingAuth } = useAuthStore();
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' }); // Detect mobile devices


  // Fetch the current expiry setting for the selected user
  useEffect(() => {
    const fetchExpirySetting = async () => {
      if (!selectedGroup || !user || !user._id) {
        // console.error("No selected user or logged-in user");
        return;
      }
      try {
        const response = await axiosInstance.get(`/auth/${user._id}/disappear-settings`);
        const disappearSettings = response.data.disappearSettings;
        const selectedUserSetting = disappearSettings[selectedGroup._id] || "off"; // Default to 'off' if no setting exists
  
        // Convert the setting to a number (5, 10) or null (off)
        const expiry = selectedUserSetting === "off" ? null : parseInt(selectedUserSetting);
        setExpiryTime(expiry); // Update expiryTime in the store
      } catch (error) {
        // console.error("Error fetching expiry settings:", error);
      }
    };
  
    fetchExpirySetting();
  }, [selectedGroup, user, setExpiryTime]);

  // Handle expiry time selection
  const handleExpirySelect = async (time) => {
    if (!selectedGroup || !user || !user._id) {
      // console.error("No user selected or logged in");
      return;
    }

    try {
      // Update the expiry time in the backend
      const response = await axiosInstance.post(`/auth/${user._id}/disappear-settings`, {
        contactId: selectedGroup._id,
        setting: time === null ? "off" : `${time}min`, // Convert to '5min', '10min', or 'off'
      });

      // Update the expiryTime in the store
      setExpiryTime(time);
    } catch (error) {
      // console.error("Error updating expiry settings:", error);
    }
  };

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3" onClick={onHeaderClick}>
          {/* Group Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedGroup?.profilePic || "/avatar.png"} alt={selectedGroup?.name} />
            </div>
          </div>

          {/* Group Info */}
          <div>
            <h3 className="font-medium">{selectedGroup?.name}</h3>
            <p className="text-sm text-base-content/70">
              {selectedGroup?.members.length} members
            </p>
          </div>
        </div>

         {/* Expiry dropdown and close button */}
         <div className="flex items-center gap-4">
          {/* Expiry dropdown */}
          <div className="dropdown dropdown-end z-20">
            <label tabIndex={0} className="btn btn-sm btn-ghost">
              <Clock size={18} /> {/* Clock icon for expiry */}
              <span className="ml-1">{expiryTime ? `${expiryTime} min` : "Off"}</span>
            </label>
            <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-40">
            <li><button onClick={() => handleExpirySelect(1)}>1 minute</button></li>
              <li><button onClick={() => handleExpirySelect(5)}>5 minutes</button></li>
              <li><button onClick={() => handleExpirySelect(10)}>10 minutes</button></li>
              <li><button onClick={() => handleExpirySelect(null)}>Off</button></li>
            </ul>
          </div>

          {/* Close Button */}
          {!isMobile && (
            <button onClick={() => setSelectedGroup(null)}>
              <X />
            </button>
          )}

          {/* Mobile close button */}
          {onChatClose && (
            <button onClick={onChatClose} className="lg:hidden p-2">
              <X className="size-6" /> {/* Close icon */}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupHeader;