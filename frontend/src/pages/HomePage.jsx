import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import HomeSidebar from "../components/HomeSidebar";
import Sidebar from "../components/Sidebar";
import GroupSidebar from "../components/GroupSidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import GroupChatContainer from "../components/GroupChatContainer";
import { useMediaQuery } from "react-responsive";
import "../index.css";

const HomePage = () => {
  const { users, selectedUser, selectedGroup, clearSelectedChat } = useChatStore();
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  // Automatically switch to individual chat when a user is selected
  useEffect(() => {
    if (selectedUser) {
      setIsGroupChat(false);
    }
  }, [selectedUser]);

  // Automatically switch to group chat when a group is selected
  useEffect(() => {
    if (selectedGroup) {
      setIsGroupChat(true);
    }
  }, [selectedGroup]);

  const handleToggleChat = (isGroup) => {
    setIsGroupChat(isGroup);
    clearSelectedChat();
    setIsChatOpen(false);
  };

  const handleChatOpen = () => {
    setIsChatOpen(true);
  };

  const handleChatClose = () => {
    setIsChatOpen(false);
    clearSelectedChat();
  };

  return (
    <div className="h-screen mx-auto bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-7xl h-[calc(100vh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <HomeSidebar onToggleChat={handleToggleChat} />

            <div className="flex-1 flex overflow-hidden">
              {/* Always show the sidebar in mobile mode if no chat is selected */}
              {(!isMobile || !isChatOpen) && (
                isGroupChat ? (
                  <GroupSidebar onChatOpen={handleChatOpen} />
                ) : (
                  <Sidebar onChatOpen={handleChatOpen} />
                )
              )}

              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Hide NoChatSelected in mobile mode when sidebar is visible */}
                {!isMobile && !selectedUser && !selectedGroup ? (
                  <NoChatSelected />
                ) : selectedUser ? (
                  <ChatContainer onChatClose={isMobile ? handleChatClose : null} />
                ) : selectedGroup ? (
                  <GroupChatContainer onChatClose={isMobile ? handleChatClose : null} />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;