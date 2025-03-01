import { X, Clock, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import ChatMedia from "./ChatMedia";
import UserDeleteConfirmationModal from './UserDeleteConfirmationModal';
import ChatMediaSection from "./ChatMediaSection";

const ChatHeaderInfo = ({ onHeaderClick, onChatClose, onClose, onShowMedia }) => {
  const { selectedUser, setSelectedUser, setExpiryTime, expiryTime, deleteChat } = useChatStore();
  const { onlineUsers, authUser: user, isCheckingAuth } = useAuthStore();
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMediaSectionOpen, setIsMediaSectionOpen] = useState(false); // <-- New state

  const openDeleteModal = () => setIsDeleteModalOpen(true);
  const closeDeleteModal = () => setIsDeleteModalOpen(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => { setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); };

  const handleDeleteChat = async () => {
    await deleteChat(selectedUser._id);
    closeDeleteModal();
  };

  const handleSeeMoreToggle = () => {
    setIsSeeMoreOpen(!isSeeMoreOpen);
  };

  // Fetch expiry settings (existing code)
  useEffect(() => {
    const fetchExpirySetting = async () => {
      if (!selectedUser || !user || !user._id) {
        // console.error("No selected user or logged-in user");
        return;
      }
      try {
        const response = await axiosInstance.get(`/auth/${user._id}/disappear-settings`);
        const disappearSettings = response.data.disappearSettings;
        const selectedUserSetting = disappearSettings[selectedUser._id] || "off";
        const expiry = selectedUserSetting === "off" ? null : parseInt(selectedUserSetting);
        setExpiryTime(expiry);
      } catch (error) {
        // console.error("Error fetching expiry settings:", error);
      }
    };

    fetchExpirySetting();
  }, [selectedUser, user, setExpiryTime]);

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3" onClick={onHeaderClick}>
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser?.profilePic || "/avatar.png"} alt={selectedUser?.fullName} />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser?.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {onlineUsers.includes(selectedUser?._id) ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Expiry dropdown, delete button, and close button */}
        <div className="flex items-center gap-4">
          {/* Close button */}
          {!isMobile && (
            <button onClick={onClose}>
              <X />
            </button>
          )}
          
          {/* Mobile close button */}
          {isMobile && (
            <button onClick={onClose} className="lg:hidden p-2">
              <X className="size-6" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-base-100 p-4 w-full overflow-y-auto max-h-[calc(100vh-180px)]" style={{ backgroundColor: "transparent", scrollbarWidth: "thin", scrollbarColor: "#5A67D8 transparent" }}>
          <div className="mt-4">
          <ChatMedia userToChatId={selectedUser._id} onSeeMoreClick={handleSeeMoreToggle} />
        </div>

        <button onClick={onShowMedia} className="btn btn-secondary w-full mt-2">
          View Media
        </button>

        <div className="mx-auto bg-base-100 p-4 rounded-lg w-full max-w-md overflow-y-auto overflow-hidden">
          <button className="bg-red-500 text-white py-2 px-4 rounded-md w-full" onClick={openDeleteModal}>Delete Chat</button>
          {/* Delete confirmation modal */}
          <UserDeleteConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={closeDeleteModal}
            onConfirm={handleDeleteChat}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatHeaderInfo;

