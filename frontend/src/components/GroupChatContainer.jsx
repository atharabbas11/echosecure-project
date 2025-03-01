// GroupChatContainer.jsx
import { useState, useEffect, useRef } from "react";
import { Smile, ThumbsUp, Heart, Laugh, Clock, Reply, Pin, Edit } from "lucide-react";
import { File, FileText, FileArchive, FileSpreadsheet } from "lucide-react";
import { CircleChevronRight } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import GroupHeader from "./GroupHeader";
import GroupMessageInput from "./GroupMessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { useMediaQuery } from "react-responsive";
import GroupMediaSection from "./GroupMediaSection";
import GroupHeaderInfo from "./GroupHeaderInfo";
import { axiosInstance } from "../lib/axios";
import Picker from '@emoji-mart/react';
import emojiData from "@emoji-mart/data";
import GroupReactionUsersModal from "./GroupReactionUserModal";
import OpenLayersMapComponent from "./OpenLayersMapComponent";

const GroupChatContainer = ({ onChatClose }) => {
  const {
    groupMessages,
    pinnedGroupMessages,
    getGroupMessages,
    isMessagesLoading,
    setGroupMessages,
    selectedGroup,
    subscribeToGroupMessages,
    unsubscribeFromGroupMessages,
    removeMessage,
    setRepliedTo,
    pinGroupMessage,
    unpinGroupMessage,
    getPinnedGroupMessages,
    editGroupMessage,
    users,
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);
  const activeTimers = useRef(new Set());
  const [showGroupInfo, setShowGroupInfo] = useState(false); // Track if GroupHeaderInfo is shown
  const [showGroupMedia, setShowGroupMedia] = useState(false); // Track if GroupMediaSection is shown
  const [touchStartX, setTouchStartX] = useState(null);
  const [showReactionPopup, setShowReactionPopup] = useState(null);
  const [showReactionUsersModal, setShowReactionUsersModal] = useState(false);
  const [reactionUsers, setReactionUsers] = useState([]);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const emojiPickerRef = useRef(null);
  const chatContainerRef = useRef(null);

  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [isLoadingContact, setIsLoadingContact] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleContactClick = async (contactId) => {
    try {
      // Fetch all users
      const response = await axiosInstance.get('/messages/users');
      const allUsers = response.data;

      // Find the specific contact user from the list
      const contactUser = allUsers.find(user => user._id === contactId);

      if (contactUser) {
        // Update the selectedUser in the chat store and clear selectedGroup
        useChatStore.setState({
          selectedUser: contactUser,
          selectedGroup: null, // Clear the selected group
        });

        // Fetch messages and pinned messages for this user
        getMessages(contactUser._id);
        getPinnedGroupMessages(contactUser._id);
      } else {
        // console.error("Contact user not found");
      }
    } catch (error) {
      // console.error("Failed to fetch contact user:", error);
    }
  };

  useEffect(() => {
    const markMessagesAsRead = async () => {
      const unreadMessages = groupMessages.filter(
        (msg) => msg.receiverId === authUser._id && !msg.readBy.includes(authUser._id)
      );

      for (const message of unreadMessages) {
        try {
          await axiosInstance.post(`groups/messages/group/${message._id}/read`);
        } catch (error) {
          // console.error("Failed to mark message as read:", error);
        }
      }
    };

    markMessagesAsRead();
  }, [groupMessages, authUser._id]);

  // Reset input states when selectedUser changes
  useEffect(() => {
    // Reset the input states when the selected user changes
    setRepliedTo(null); // Reset repliedTo state
    setEditingMessageId(null); // Reset editing state
    setEditedText(""); // Reset edited text
  }, [selectedGroup]);

  const handleEditMessage = (messageId, currentText) => {
    setEditingMessageId(messageId);
    setEditedText(currentText);
  };

  const handleSaveEdit = async () => {
    if (editedText.trim()) {
      await editGroupMessage(editingMessageId, editedText);
      setEditingMessageId(null);
      setEditedText("");
    }
  };

  // Check if the message is within the 5-minute edit window
  const isWithinEditWindow = (message) => {
    const messageTime = new Date(message.createdAt).getTime();
    const currentTime = Date.now();
    const fiveMinutesInMillis = 5 * 60 * 1000; // 5 minutes in milliseconds
    return currentTime - messageTime <= fiveMinutesInMillis;
  };

  const handlePinMessage = async (messageId) => {
    await pinGroupMessage(messageId);
  };

  const handleUnpinMessage = async (messageId) => {
    await unpinGroupMessage(messageId);
  };

  const handleReactionClick = (messageId) => {
    setShowReactionPopup(messageId);
    setEmojiPickerVisible((prev) => !prev);
  };

  const handleReact = async (messageId, emoji) => {
    try {
      const response = await axiosInstance.post(`/groups/messages/group/${messageId}/react`, { emoji });
      const { removed } = response.data;
      setEmojiPickerVisible(false);
    } catch (error) {
      // console.error("Failed to react to message:", error);
    }
  };

  const handleShowReactionUsers = async (message) => {
    try {
      const response = await axiosInstance.get(`/groups/messages/group/${message._id}/reactions`);
      setReactionUsers(response.data);
      setSelectedMessageId(message._id); // Set the selected message ID
      setShowReactionUsersModal(true);
    } catch (error) {
      // console.error("Failed to fetch reaction users:", error);
    }
  };

  const isMobile = useMediaQuery({ query: '(max-width: 768px)' }); // Detect mobile devices

  useEffect(() => {
    if (!socket) return; // Ensure the socket is available

    // Listen for new group messages
    const handleNewGroupMessage = (newMessage) => {
      if (selectedGroup && newMessage.groupId === selectedGroup._id) {
        setGroupMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    };

    socket.on("newGroupMessage", handleNewGroupMessage);

    // Cleanup: Remove the event listener when the component unmounts
    return () => {
      socket.off("newGroupMessage", handleNewGroupMessage);
    };
  }, [socket, selectedGroup, setGroupMessages]);

  useEffect(() => {
    if (selectedGroup) {
      getGroupMessages(selectedGroup._id);
      getPinnedGroupMessages(selectedGroup._id);
      subscribeToGroupMessages();
    }
    return () => unsubscribeFromGroupMessages();
  }, [selectedGroup, getGroupMessages, getPinnedGroupMessages, subscribeToGroupMessages, unsubscribeFromGroupMessages]);


  const handleHeaderClick = () => {
    setShowGroupInfo(true); // Show GroupHeaderInfo
    setShowGroupMedia(false); // Ensure GroupMediaSection is hidden
  };

  const handleCloseGroupInfo = () => {
    setShowGroupInfo(false); // Hide GroupHeaderInfo
  };

  const handleShowGroupMedia = () => {
    setShowGroupMedia(true); // Show GroupMediaSection
    setShowGroupInfo(false); // Ensure GroupHeaderInfo is hidden
  };

  const handleCloseGroupMedia = () => {
    setShowGroupMedia(false); // Hide GroupMediaSection
    setShowGroupInfo(true);  // Show GroupHeaderInfo when media is closed
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (messageEndRef.current && groupMessages) {
        messageEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [groupMessages]);

  useEffect(() => {
    groupMessages.forEach((message) => {
      if (message.expiresAt && !activeTimers.current.has(message._id)) {
        const timeLeft = new Date(message.expiresAt).getTime() - Date.now();
        if (timeLeft > 0) {
          activeTimers.current.add(message._id);
          setTimeout(() => {
            removeMessage(message._id);
            activeTimers.current.delete(message._id);
          }, timeLeft);
        } else {
          removeMessage(message._id);
        }
      }
    });

    return () => {
      activeTimers.current.clear();
    };
  }, [groupMessages, removeMessage]);

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e, messageId) => {
    if (touchStartX === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    const SWIPE_THRESHOLD = 50;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      setRepliedTo(messageId); // Trigger reply
    }
    setTouchStartX(null);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setEmojiPickerVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const scrollToMessage = (messageId) => {
    // console.log(`Scrolling to message with ID: ${messageId}`);
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      // console.log("Message element found:", messageElement);
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      // console.error(`Message with ID ${messageId} not found.`);
    }
  };

  const isMessageInView = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      const rect = messageElement.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
      );
    }
    return false;
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <GroupHeader onHeaderClick={handleHeaderClick} />
        <MessageSkeleton />
      </div>
    );
  }

  // Function to get sender's profile picture
  const getSenderProfilePic = (senderId) => {
    const sender = users.find((user) => user._id === senderId);
    return sender ? sender.profilePic || "/avatar.png" : "/avatar.png";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" ref={chatContainerRef}>
      {/* If showGroupInfo is true, display GroupHeaderInfo instead of GroupHeader */}
      {showGroupInfo ? (
        <GroupHeaderInfo onClose={handleCloseGroupInfo} onShowMedia={handleShowGroupMedia} />
      ) : showGroupMedia ? (
        <GroupMediaSection onClose={handleCloseGroupMedia} />
      ) : (
        <>
          {/* Chat Header */}
          <GroupHeader onChatClose={onChatClose} onHeaderClick={handleHeaderClick} />

          {/* Pinned Messages Bar */}
          {pinnedGroupMessages.length > 0 && (
            <div className="pinned-messages-bar bg-gray-100 p-1 border-b flex items-center justify-between">

              {/* Single Pinned Message */}
              <div className={`w-full pinned-message bg-white rounded cursor-pointer border ${isMessageInView(pinnedGroupMessages[currentIndex]._id) ? "border-green-500" : "border-gray-300"}`} onClick={() => scrollToMessage(pinnedGroupMessages[currentIndex]._id)}>
                <div className="flex justify-between items-center">
                  <div className="flex gap-5 items-center">
                    {/* Display image if it exists */}
                    {pinnedGroupMessages[currentIndex].image && (
                      <img src={pinnedGroupMessages[currentIndex].image} alt="Pinned" className="w-8 h-8 object-cover rounded-lg" />
                    )}

                    {/* Display video if it exists */}
                    {pinnedGroupMessages[currentIndex].video && (
                      <video src={pinnedGroupMessages[currentIndex].video} controls className="w-8 h-8 object-cover rounded-lg" />
                    )}

                    {/* Display voice if it exists */}
                    {pinnedGroupMessages[currentIndex].voice && (
                      <audio src={pinnedGroupMessages[currentIndex].voice} controls className="w-8 h-8 object-cover rounded-lg" />
                    )}

                    {/* Display contact if it exists */}
                    {pinnedGroupMessages[currentIndex].contact && (
                      <div className="flex items-center gap-2">
                        <img
                          src={pinnedGroupMessages[currentIndex].contact.profilePic || "/avatar.png"}
                          className="h-8 w-8 rounded-full"
                        />
                        <p className="text-sm truncate">{pinnedGroupMessages[currentIndex].contact.fullName}</p>
                      </div>
                    )}

                    {/* Display document if it exists */}
                    {pinnedGroupMessages[currentIndex].document && (
                      <a href={pinnedGroupMessages[currentIndex].document} target="_blank" rel="noopener noreferrer" className="text-blue-500 h-8">
                        {pinnedGroupMessages[currentIndex].originalName || "Document"}
                      </a>
                    )}

                    {/* Display location if it exists */}
                    {pinnedGroupMessages[currentIndex].location && (
                      <OpenLayersMapComponent coordinates={pinnedGroupMessages[currentIndex].location.coordinates} className="w-8 h-8 rounded-lg" />
                    )}

                    {/* Display GIF if it exists */}
                    {pinnedGroupMessages[currentIndex].gif && (
                      <img src={pinnedGroupMessages[currentIndex].gif} alt="GIF" className="w-8 h-8 rounded-lg" />
                    )}
                    
                    {/* Display text if it exists */}
                    {pinnedGroupMessages[currentIndex].text && (
                      <p className="text-sm truncate h-8">{pinnedGroupMessages[currentIndex].text}</p>
                    )}
                  </div>
                  {/* Unpin button */}
                  <button onClick={(e) => { e.stopPropagation(); handleUnpinMessage(pinnedGroupMessages[currentIndex]._id); }}>
                    <Pin size={16} />
                  </button>
                </div>
                <p className="text-xs text-gray-500">{formatMessageTime(pinnedGroupMessages[currentIndex].createdAt)}</p>
              </div>

              {/* Next Button (Only Right Arrow) */}
              <button onClick={() => setCurrentIndex((prev) => (prev + 1) % pinnedGroupMessages.length)} className="p-1 rounded-full hover:bg-gray-200">
                <CircleChevronRight size={20} />
              </button>

            </div>
          )}

        </>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: "transparent", scrollbarWidth: "thin", scrollbarColor: "#5A67D8 transparent", }}>
        {/* Only show the chat messages and input if GroupHeaderInfo and GroupMediaSection are not visible */}
        {!showGroupInfo && !showGroupMedia && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {groupMessages.map((message, index) => (
              <div
                key={message._id}
                id={`message-${message._id}`}
                className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
                ref={messageEndRef}
                onTouchStart={isMobile ? handleTouchStart : null} // Only add touch event handler for mobile
                onTouchEnd={isMobile ? (e) => handleTouchEnd(e, message._id) : null} // Only add touch event handler for mobile
              >
                <div className="chat-image avatar">
                  <div className="size-10 rounded-full border">
                    <img src={message.senderId === authUser._id ? authUser.profilePic || "/avatar.png" : getSenderProfilePic(message.senderId)} alt="profile pic"/>
                  </div>
                </div>
                <div className="chat-bubble pr-2 pl-2 flex flex-col relative group max-w-[80%] lg:max-w-[60%] mb-2">
                  {editingMessageId === message._id ? (
                    <div className="flex flex-col">
                      <input
                        type="text"
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="input input-bordered w-full mb-2"
                      />
                      <button onClick={handleSaveEdit} className="btn btn-sm btn-primary">
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Message Actions (Reply, React, Pin, Edit) */}
                      <div className="flex gap-1 absolute -top-4 right-0 bg-white p-1 rounded-lg shadow-sm">
                        {!isMobile && (
                          <button type="button" onClick={() => setRepliedTo(message._id)}>
                            <Reply size={16} />
                          </button>
                        )}
                        <button onClick={() => handleReactionClick(message._id)}>
                          <Smile size={16} />
                        </button>
                        <button onClick={() => handlePinMessage(message._id)}>
                          <Pin size={16} />
                        </button>
                        {message.senderId === authUser._id && isWithinEditWindow(message) && (
                          <button onClick={() => handleEditMessage(message._id, message.text)}>
                            <Edit size={16} />
                          </button>
                        )}
                      </div>

                      <span className="font-bold">{message.senderName}</span>

                      {/* Replied Message */}
                      {message.repliedTo && (
                        <div
                          className="bg-base-300 p-1 rounded-lg mb-1 cursor-pointer hover:bg-base-200 transition-colors"
                          onClick={() => scrollToMessage(message.repliedTo)} // Add click handler
                        >
                          <p className="text-sm text-gray-600">Replying to:</p>
                          {(() => {
                            const repliedMessage = groupMessages.find((msg) => msg._id === message.repliedTo);
                            if (!repliedMessage) {
                              return <p className="text-sm text-gray-500">Message not found</p>;
                            }

                            // Render based on the type of replied message
                            return (
                              <div className="text-sm">
                                {repliedMessage.text && repliedMessage.text !== "null" && (
                                  <p>{repliedMessage.text}</p>
                                )}

                                {repliedMessage.image && (
                                  <img
                                    src={repliedMessage.image}
                                    alt="Replied Image"
                                    className="w-10 h-10 object-cover rounded-md"
                                  />
                                )}

                                {repliedMessage.video && (
                                  <video
                                    controls
                                    className="w-10 h-10 object-cover rounded-md"
                                  >
                                    <source src={repliedMessage.video} type="video/mp4" />
                                    Your browser does not support the video tag.
                                  </video>
                                )}

                                {repliedMessage.voice && (
                                  <audio
                                    controls
                                    className="w-10 h-10 mx-auto bg-gray-100 border rounded-lg shadow-lg p-2"
                                  >
                                    <source src={repliedMessage.voice} type="audio/mpeg" />
                                    Your browser does not support the audio element.
                                  </audio>
                                )}

                                {repliedMessage.location && (
                                  <div className="mt-2">
                                    <OpenLayersMapComponent
                                      coordinates={repliedMessage.location.coordinates}
                                      className="h-10 w-10 rounded-md"
                                    />
                                    <a
                                      href={`https://www.openstreetmap.org/?mlat=${repliedMessage.location.coordinates[1]}&mlon=${repliedMessage.location.coordinates[0]}#map=15/${repliedMessage.location.coordinates[1]}/${repliedMessage.location.coordinates[0]}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 underline mt-2 block"
                                    >
                                      Open in OpenStreetMap
                                    </a>
                                  </div>
                                )}

                                {repliedMessage.document && (
                                  <div className="mt-2">
                                    <a
                                      href={repliedMessage.document}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 underline h-8 w-8"
                                    >
                                      {repliedMessage.originalName || "Download Document"}
                                    </a>
                                  </div>
                                )}

                                {repliedMessage.contact && (
                                  <div className="mt-2 p-2 bg-gray-100 rounded-lg cursor-pointer">
                                    <p className="text-xs text-gray-600">Shared Contact:</p>
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={repliedMessage.contact.profilePic || "/avatar.png"}
                                        className="h-4 w-4 rounded-full"
                                      />
                                      <p className="text-sm">{repliedMessage.contact.fullName}</p>
                                    </div>
                                  </div>
                                )}

                                {repliedMessage.gif && (
                                  <img
                                    src={repliedMessage.gif}
                                    alt="Replied Image"
                                    className="w-8 h-8 object-cover rounded-md"
                                  />
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {message.image && (
                          <img
                            src={message.image}
                            alt="Attachment"
                            className="w-full max-w-[200px] lg:max-w-[250px] rounded-md mb-2"
                          />
                      )}

                      {message.voice && (
                        <audio controls className={`mx-auto bg-gray-100 border rounded-lg shadow-lg p-2 ${ isMobile ? "w-20" : "max-w-60" }`}>
                          <source src={message.voice} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      )}
                        
                      {message.video && (
                          <video controls className="max-w-[250px] lg:max-w-[350px] rounded-md">
                            <source src={message.video} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                      )}

                      {message.location && (
                          <>
                            <OpenLayersMapComponent lat={message.location.coordinates[1]} lng={message.location.coordinates[0]} className="h-40 w-full" />
                            <a href={`https://www.openstreetmap.org/?mlat=${message.location.coordinates[1]}&mlon=${message.location.coordinates[0]}#map=15/${message.location.coordinates[1]}/${message.location.coordinates[0]}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline mt-2 block">
                              Open in OpenStreetMap
                            </a>
                          </>
                      )}

                      {message.document && (
                          <div className="mt-2">
                            <a href={message.document} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                              {message.originalName ? (
                                <>
                                  {message.originalName.endsWith(".pdf") && <File className="inline-block mr-2" />}
                                  {message.originalName.endsWith(".ppt") && <FileSpreadsheet className="inline-block mr-2" />}
                                  {(message.originalName.endsWith(".docx") || message.originalName.endsWith(".docs")) && <FileText className="inline-block mr-2" />}
                                  {message.originalName.endsWith(".zip") && <FileArchive className="inline-block mr-2" />}
                                  {message.originalName}
                                </>
                              ) : (
                                "Download Document"
                              )}
                            </a>
                          </div>
                      )}

                      {message.contact && (
                          <div className="mt-2 p-2 bg-gray-100 rounded-lg cursor-pointer" onClick={() => handleContactClick(message.contact.userId)}>
                            <p className="text-sm text-gray-600">Shared Contact:</p>
                            <div className="flex items-center gap-2">
                              <img src={message.contact.profilePic || "/avatar.png"} className="h-8 w-8 rounded-full" />
                              <p className="text-sm">{message.contact.fullName}</p>
                            </div>
                          </div>
                      )}

                      {message.gif && (
                        <img src={message.gif} alt="GIF" className="w-40 h-40 rounded-lg" />
                      )}
                        
                      {message.text && message.text !== "null" && <p className="min-w-20">{message.text}</p>}

                      <p className="text-xxs text-right mt-1">
                          {message.isEdited && <span className="text-gray-500 mr-1">(edited)</span>}
                          {formatMessageTime(message.createdAt)}
                          {message.expiresAt && (
                            <span className="text-red-500 text-xxs ml-2 flex items-center">
                              <Clock size={isMobile ? 12 : 16} />{" "}
                              {`Expires at: ${new Date(message.expiresAt).toLocaleTimeString()}`}
                            </span>
                          )}
                      </p>

                      {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <div className={`absolute -bottom-4 ${message.senderId === authUser._id ? "left-10" : "left-10"} transform -translate-x-1/2 flex space-x-2 bg-white rounded-full shadow-m`}>
                          {Object.entries(message.reactions).map(([emoji, users]) => (
                            <button key={emoji} onClick={() => handleShowReactionUsers(message)}
                              className={`flex items-center space-x-1 ${users.includes(authUser._id) ? "opacity-100" : "opacity-50"}`}>
                              <span>{emoji}</span>
                              <span className="text-sm text-gray-600">{users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {emojiPickerVisible && showReactionPopup === message._id && (
                          <div
                            ref={emojiPickerRef}
                            className={`absolute z-40 shadow-lg bg-white rounded-md border overflow-hidden 
                              ${message.senderId === authUser._id ? "right-0" : "left-0"} 
                              ${index >= groupMessages.length - 2 ? "bottom-full mb-2" : "mt-2"}`}
                            style={{
                              maxHeight: isMobile ? "200px" : "200px", // Smaller height for mobile
                              width: isMobile ? "250px" : "auto", // Smaller width for mobile
                              transform: isMobile ? (message.senderId === authUser._id) ? "translateX(-80%)" : "translateX(-20%)" : "none", // Adjust transform based on sender
                              left: isMobile && message.senderId === authUser._id ? "50%" : "auto", // Center on mobile
                            }}
                          >
                            <Picker
                              data={emojiData}
                              onEmojiSelect={(emoji) => handleReact(message._id, emoji.native)}
                              previewPosition="none" // Hide the preview bar to save space
                              searchPosition="top" // Move search bar to the top for better usability
                              emojiSize={isMobile ? 20 : 24} // Smaller emoji size for mobile
                              perLine={isMobile ? 6 : 8} // Fewer emojis per line for mobile
                            />
                          </div>
                      )}
                    </>
                  )}
                </div>
                
                {message.senderId === authUser._id && (
                  <span className="text-xxs">
                    {message.readBy.includes(message.receiverId) ? "Seen" : "Sent"}
                  </span>
                )}
                {index === groupMessages.length - 1 && <div ref={messageEndRef} />}
              </div>
              ))}
          </div>
        )}
      </div>
      {/* Show the message input only when GroupHeaderInfo and GroupMediaSection are not visible */}
      {!showGroupInfo && !showGroupMedia && <GroupMessageInput isGroupChat={true} />}
      {showReactionUsersModal && (
        <GroupReactionUsersModal
          reactions={reactionUsers}
          onClose={() => setShowReactionUsersModal(false)}
          messageId={selectedMessageId} // Pass the messageId
          currentUserId={authUser._id} // Pass the authenticated user's ID
        />
      )}
    </div>
  );
};

export default GroupChatContainer;