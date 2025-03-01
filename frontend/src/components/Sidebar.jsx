import { useEffect, useState, useRef, memo } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, User, Mic, Video, MapPin, SquareUser, ImagePlay, UserPlus, X } from "lucide-react";
import { File, FileText, FileArchive, AppWindow } from "lucide-react";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { decryptMessage } from "../store/useChatStore";
import { useMediaQuery } from "react-responsive";

const Sidebar = memo(({ onChatOpen }) => {
  const {  getUsers, users, selectedUser, setSelectedUser, isUsersLoading, subscribeToMessages, unsubscribeFromMessages, removeMessage, getUsersNotMessaged } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  const activeTimers = useRef(new Set()); // to track active timers

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [usersNotMessaged, setUsersNotMessaged] = useState([]);

  // useEffect(() => {
  //   console.log("Users State:", users); // Log users state
  // }, [users]);
  
  // useEffect(() => {
  //   console.log("Users Not Messaged State:", usersNotMessaged); // Log users not messaged state
  // }, [usersNotMessaged]);

  // useEffect(() => {
  //   console.log("Users State Updated:", users); // Log the users state
  // }, [users]);

  // Function to format the timestamp into a readable format
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hours}:${minutes} ${ampm}`;
  };

  // Subscribe to messages when the component mounts
  useEffect(() => {
    subscribeToMessages();
    return () => {
      unsubscribeFromMessages();
    };
  }, [subscribeToMessages, unsubscribeFromMessages]);

  // Fetch users on mount
  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Fetch users not messaged when modal opens
  useEffect(() => {
    if (isModalOpen) {
      getUsersNotMessaged().then(setUsersNotMessaged);
    }
  }, [isModalOpen, getUsersNotMessaged]);

  useEffect(() => {
    users.forEach((user) => {
      if (user.latestMessage && user.latestMessage.expiresAt && !activeTimers.current.has(user.latestMessage._id)) {
        const timeLeft = new Date(user.latestMessage.expiresAt).getTime() - Date.now();
        if (timeLeft > 0) {
          activeTimers.current.add(user.latestMessage._id);
          setTimeout(() => {
            removeMessage(user.latestMessage._id); // This will update both ChatContainer and Sidebar
            activeTimers.current.delete(user.latestMessage._id);
          }, timeLeft);
        } else {
          removeMessage(user.latestMessage._id); // This will update both ChatContainer and Sidebar
        }
      }
    });
  
    return () => {
      activeTimers.current.clear();
    };
  }, [users, removeMessage]);

  // Filter users based on online status
  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className={`h-full ${isMobile ? 'w-full' : 'w-20 lg:w-96'} ${!isMobile ? 'border-r border-base-300' : ''} flex flex-col transition-all duration-200 relative`}>
      <div className="border-b border-base-300 w-full p-3 lg:p-5">
        <div className="flex items-center gap-2">
          <User className="size-5 lg:size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>

        <div className="mt-3 lg:hidden flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input type="checkbox" checked={showOnlineOnly} onChange={(e) => setShowOnlineOnly(e.target.checked)} className="checkbox checkbox-sm"/>
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>

        <div className={`mt-3 flex items-center gap-2 ${isMobile ? '' : 'lg:flex'}`}>
          <button onClick={() => setIsModalOpen(true)} className="px-2 py-1 bg-base-100 text-white rounded hover:bg-base-300 border border-grey-300">Search Users</button>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-2 lg:py-3">
        {filteredUsers.map((user) => (
          <button key={user._id} onClick={() => { setSelectedUser(user); onChatOpen(); }} className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${ selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : "" }`}>
            {/* Profile Image */}
            <div className="relative mx-auto lg:mx-0">
              <img src={user.profilePic || "/avatar.png"} alt={user.name} className="size-10 lg:size-12 object-cover rounded-full"/>
              {onlineUsers.includes(user._id) ? (
                <span className="absolute bottom-0 right-0 size-2 lg:size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
              ) : (
                <span className="absolute bottom-0 right-0 size-2 lg:size-3 bg-gray-500 rounded-full ring-2 ring-zinc-900" />
              )}
            </div>
          
            {/* User Name and Last Message */}
            <div className="text-left min-w-0 w-full">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-sm text-zinc-400">
              {/* Display the latest message */}
              {user.latestMessage && (
                <div className="text-sm text-zinc-500 truncate flex">
                  {/* Case: Only Voice message is sent */}
                  {!user.latestMessage.text && user.latestMessage.voice && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            <Mic className="size-4" />
                            <span>Voice</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            <Mic className="size-4" />
                            <span>Voice</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs mt-[2px] text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}

                  {/* Case: Only Video message is sent */}
                  {!user.latestMessage.text && user.latestMessage.video && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            <Video className="size-4" />
                            <span>Video</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            <Video className="size-4" />
                            <span>Video</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs mt-[2px] text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}

                  {/* Case: Only Image message is sent */}
                  {!user.latestMessage.text && user.latestMessage.image && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            <Camera className="size-4" />
                            <span>Photo</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            <Camera className="size-4" />
                            <span>Photo</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}

                  {/* Case: Only Location message is sent */}
                  {!user.latestMessage.text && user.latestMessage.location && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            <MapPin className="size-4" />
                            <span>Map</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            <MapPin className="size-4" />
                            <span>Map</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}

                  {/* Case: Only Document message is sent */}
                  {!user.latestMessage.text && user.latestMessage.document && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            {user.latestMessage.originalName?.endsWith(".pdf") && <File className="size-4" />}
                            {user.latestMessage.originalName?.endsWith(".ppt") && <AppWindow className="size-4" />}
                            {(user.latestMessage.originalName?.endsWith(".docx") || user.latestMessage.originalName?.endsWith(".docs")) && <FileText className="size-4" />}
                            {user.latestMessage.originalName?.endsWith(".zip") && <FileArchive className="size-4" />}
                            <span>Document</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            {user.latestMessage.originalName?.endsWith(".pdf") && <File className="inline-block mr-2" />}
                            {user.latestMessage.originalName?.endsWith(".ppt") && <AppWindow className="inline-block mr-2" />}
                            {(user.latestMessage.originalName?.endsWith(".docx") || user.latestMessage.originalName?.endsWith(".docs")) && <FileText className="inline-block mr-2" />}
                            {user.latestMessage.originalName?.endsWith(".zip") && <FileArchive className="inline-block mr-2" />}
                            <span>Document</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}

                  {/* Case: Only Contact message is sent */}
                  {!user.latestMessage.text && user.latestMessage.contact && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            <SquareUser className="size-4" />
                            <span>Contact</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            <SquareUser className="size-4" />
                            <span>Contact</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}
                  
                  {/* Case: Only GIF message is sent */}
                  {!user.latestMessage.text && user.latestMessage.gif && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            <ImagePlay className="size-4" />
                            <span>GIF</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            <ImagePlay className="size-4" />
                            <span>GIF</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs mt-[2px] text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}
                  
                  {/* Case: Only Text message is sent */}
                  {user.latestMessage.text && !user.latestMessage.image && !user.latestMessage.voice && !user.latestMessage.video && !user.latestMessage.location && !user.latestMessage.document && !user.latestMessage.contact && !user.latestMessage.gif&& (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                          <>
                            <span className="font-medium">You:</span>
                            <span>
                              {(() => {
                                const decryptedText = decryptMessage(user.latestMessage.text);
                                return decryptedText.length > 15
                                  ? decryptedText.slice(0, 15) + "..."
                                  : decryptedText;
                              })()}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium">{user.fullName}:</span>
                            <span>
                              {(() => {
                                const decryptedText = decryptMessage(user.latestMessage.text);
                                return decryptedText.length > 15
                                  ? decryptedText.slice(0, 15) + "..."
                                  : decryptedText;
                              })()}
                            </span>
                          </>
                        )
                      }
                      <span className="text-xs text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}

                  {/* Case: Text + Voice */}
                  {user.latestMessage.text && user.latestMessage.voice && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            <Mic className="size-4" />
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            <Mic className="size-4" />
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}

                  {/* Case: Text + Video */}
                  {user.latestMessage.text && user.latestMessage.video && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            <Video className="size-4" />
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            <Video className="size-4" />
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}

                  {/* Case: Text + Image */}
                  {user.latestMessage.text && user.latestMessage.image && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            <Camera className="size-4" />
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            <Camera className="size-4" />
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}
                  
                  {/* Case: Text + Location */}
                  {user.latestMessage.text && user.latestMessage.location && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            <MapPin className="size-4" />
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            <MapPin className="size-4" />
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}

                  {/* Case: Text + Document */}
                  {user.latestMessage.text && user.latestMessage.document && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            {user.latestMessage.originalName?.endsWith(".pdf") && <File className="size-4" />}
                            {user.latestMessage.originalName?.endsWith(".ppt") && <AppWindow className="size-4" />}
                            {(user.latestMessage.originalName?.endsWith(".docx") || user.latestMessage.originalName?.endsWith(".docs")) && <FileText className="size-4" />}
                            {user.latestMessage.originalName?.endsWith(".zip") && <FileArchive className="size-4" />}
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            {user.latestMessage.originalName?.endsWith(".pdf") && <File className="size-4" />}
                            {user.latestMessage.originalName?.endsWith(".ppt") && <AppWindow className="size-4" />}
                            {(user.latestMessage.originalName?.endsWith(".docx") || user.latestMessage.originalName?.endsWith(".docs")) && <FileText className="size-4" />}
                            {user.latestMessage.originalName?.endsWith(".zip") && <FileArchive className="size-4" />}
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}

                  {/* Case: Text + Contact */}
                  {user.latestMessage.text && user.latestMessage.contact && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            <SquareUser className="size-4" />
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            <SquareUser className="size-4" />
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}

                  {/* Case: Text + GIF */}
                  {user.latestMessage.text && user.latestMessage.gif && (
                    <div className="flex items-center gap-2">
                      {user.latestMessage.senderId === authUser._id ? (
                        <>
                          <span className="font-medium">You:</span>
                          <div className="flex items-center gap-2">
                            <ImagePlay className="size-4" />
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{user.fullName}:</span>
                          <div className="flex items-center gap-2">
                            <ImagePlay className="size-4" />
                            <span>{decryptMessage(user.latestMessage.text)}</span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-zinc-400 ml-2">
                        {user.latestMessage.createdAt ? formatMessageTime(user.latestMessage.createdAt) : "Just now"}
                      </span>
                    </div>
                  )}
                  
                  {/* Display "Seen" or "Unseen" status */}
                  {user.latestMessage.senderId === authUser._id && (
                    <span className="text-xs text-zinc-400 ml-2 mb-1 mt-1">
                      {user.latestMessage.readBy.includes(user._id) ? "Seen" : "Unseen"}
                    </span>
                  )}
                </div>
              )}
              </div>
            </div>
          </button>        
        ))}
      </div>

      {isModalOpen && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-base-100 p-5 z-40 border-t border-base-300 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#5A67D8 transparent" }}>
          <div className="flex items-center justify-between gap-2 border-b border-base-300 w-full mb-5">
            <div className="flex items-center gap-2">
              <UserPlus className="size-6" />
              <span className="font-medium hidden lg:block">Search User</span>
            </div>
            <button onClick={() => setIsModalOpen(false)} className="flex items-center justify-center">
              <X />
            </button>
          </div>

          <div>
            <input type="text" placeholder="Search Name" className="mb-4 p-2 border border-gray-300 rounded w-full"/>

            <div className="mb-4">
              <label htmlFor="members" className="block mb-2">Users</label>
              {usersNotMessaged.length > 0 ? (
                usersNotMessaged.map((user) => (
                  <button key={user._id} onClick={() => { setSelectedUser(user); onChatOpen(); setIsModalOpen(false); }} className={`w-full pt-3 pb-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${ selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : "" }`}>
                    {/* Profile Image */}
                    <div className="relative mx-auto lg:mx-0">
                      <img src={user.profilePic || "/avatar.png"} alt={user.name} className="size-10 lg:size-12 object-cover rounded-full"/>
                      {onlineUsers.includes(user._id) ? (
                        <span className="absolute bottom-0 right-0 size-2 lg:size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                      ) : (
                        <span className="absolute bottom-0 right-0 size-2 lg:size-3 bg-gray-500 rounded-full ring-2 ring-zinc-900" />
                      )}
                    </div>
                  
                    {/* User Name and Last Message */}
                    <div className="text-left min-w-0 w-full">
                      <div className="font-medium truncate">{user.fullName}</div>
                      <div className="text-sm text-zinc-400">
                      </div>
                    </div>
                  </button>        
                ))
              ) : (
                <div>No users found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
});

export default Sidebar;