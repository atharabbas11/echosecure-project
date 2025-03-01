import { useEffect, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Users, Mic, Video, MapPin, SquareUser, ImagePlay } from "lucide-react";
import { File, FileText, FileArchive, AppWindow } from "lucide-react";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { decryptMessage } from "../store/useChatStore";
import { useMediaQuery } from "react-responsive";
import { X, Check } from "lucide-react";
import { axiosInstance } from "../lib/axios";

const GroupSidebar = ({ onChatOpen }) => {
  const { getGroups, groups, selectedGroup, setSelectedGroup, isGroupsLoading, createGroup, subscribeToGroupMessages, unsubscribeFromGroupMessages } = useChatStore();
  const { authUser } = useAuthStore(); // Add authUser to get the current user's ID
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' }); // Detect mobile devices

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]); // State to store selected members
  const [allUsers, setAllUsers] = useState([]); // State to store all users
  const [searchTerm, setSearchTerm] = useState(""); // State to store search term
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all users from the backend
  const fetchAllUsers = async () => {
    try {
      setIsLoading(true);  // Set loading state to true
      const res = await axiosInstance.get("/groups/all-users"); // Fetch all users from the backend
      setAllUsers(res.data); // Save users to state
    } catch (error) {
      // console.error("Error fetching all users:", error);
    } finally {
      setIsLoading(false); // Set loading state to false after fetching
    }
  };

  // Function to format the timestamp into a readable format
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hours}:${minutes} ${ampm}`;
  };

  // Filter users based on the search term
  const filteredUsers = allUsers.filter(user =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create a new group
  const handleCreateGroup = async () => {
    try {
      await createGroup(groupName, groupDescription, selectedMembers); // Create group with selected members
      setIsModalOpen(false); // Close modal
      setGroupName("");
      setGroupDescription("");
      setSelectedMembers([]);
    } catch (error) {
      // console.error("Error creating group:", error);
    }
  };

  useEffect(() => {
    getGroups();
    fetchAllUsers(); // Fetch users when component mounts
    subscribeToGroupMessages();
    return () => {
      unsubscribeFromGroupMessages();
    };
  }, [getGroups, subscribeToGroupMessages, unsubscribeFromGroupMessages]);

  if (isGroupsLoading) return <SidebarSkeleton />;

  return (
    <aside className={`h-full ${isMobile ? 'w-full' : 'w-20 lg:w-96'} ${!isMobile ? 'border-r border-base-300' : ''} flex flex-col transition-all duration-200 relative`}>
      <div className="border-b border-base-300 w-full p-3 lg:p-5">
        <div className="flex items-center gap-2">
          <Users className="size-5 lg:size-6" />
          <span className="font-medium hidden lg:block">Groups</span>
        </div>
        <div className={`mt-3 flex items-center gap-2 ${isMobile ? '' : 'lg:flex'}`}>
          <button onClick={() => setIsModalOpen(true)} className="px-2 py-1 bg-base-100 text-white rounded hover:bg-base-300 border border-grey-300">Create Group</button>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-2 lg:py-3">
        {groups.map((group) => (
          <button key={group._id} onClick={() => { setSelectedGroup(group); onChatOpen(); }} className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""}`}>
            <div className="relative mx-auto lg:mx-0">
              <img src={group.profilePic || "/avatar.png"} alt={group.name} className="size-10 lg:size-12 object-cover rounded-full" />
            </div>
            <div className="text-left min-w-0 w-full">
              <div className="font-medium truncate">{group.name}</div>
              {group.latestMessage && (
                <div className="text-sm text-zinc-500 truncate">
                          {/* Case 1: Only image is sent */}
                          {!group.latestMessage.text && group.latestMessage.image && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <Camera className="size-4" />
                                  <div className="flex items-center gap-2">
                                    <span>Photo</span>
                                  </div>
                                </>
                                ) : (
                                  <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Camera className="size-4" />
                                            <span>Photo</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </>
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 2: Only text is sent */}
                          {group.latestMessage.text && !group.latestMessage.image && !group.latestMessage.voice && !group.latestMessage.video && !group.latestMessage.location && !group.latestMessage.document && !group.latestMessage.contact && !group.latestMessage.gif && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  {/* <span>{decryptMessage(group.latestMessage.text)}</span> */}
                                  <span>
                                    {(() => {
                                      const decryptedText = decryptMessage(group.latestMessage.text);
                                      return decryptedText.length > 20 ? decryptedText.slice(0, 20) + "..." : decryptedText;
                                    })()}
                                  </span>
                                </>
                              ) : (
                                <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          {/* <span>{decryptMessage(group.latestMessage.text)}</span> */}
                                          <span>
                                            {(() => {
                                              const decryptedText = decryptMessage(group.latestMessage.text);
                                              return decryptedText.length > 20 ? decryptedText.slice(0, 20) + "..." : decryptedText;
                                            })()}
                                          </span>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </>
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 3: Only voice is sent */}
                          {!group.latestMessage.text && group.latestMessage.voice && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <Mic className="size-4" />
                                  <div className="flex items-center gap-2">
                                    <span>Photo</span>
                                  </div>
                                </>
                                ) : (
                                  <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Mic className="size-4" />
                                            <span>Photo</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </>
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 4: Only video is sent */}
                          {!group.latestMessage.text && group.latestMessage.video && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <Video className="size-4" />
                                  <div className="flex items-center gap-2">
                                    <span>Photo</span>
                                  </div>
                                </>
                                ) : (
                                  <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Video className="size-4" />
                                            <span>Photo</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </>
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}
                          
                          {/* Case 5: Only location is sent */}
                          {!group.latestMessage.text && group.latestMessage.location && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <MapPin className="size-4" />
                                  <div className="flex items-center gap-2">
                                    <span>Map</span>
                                  </div>
                                </>
                                ) : (
                                  <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <MapPin className="size-4" />
                                            <span>Map</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </>
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 6: Only document is sent */}
                          {!group.latestMessage.text && group.latestMessage.document && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <div className="flex items-center gap-2">
                                    {group.latestMessage.originalName?.endsWith(".pdf") && <File className="size-4" />}
                                    {group.latestMessage.originalName?.endsWith(".ppt") && <AppWindow className="size-4" />}
                                    {(group.latestMessage.originalName?.endsWith(".docx") || group.latestMessage.originalName?.endsWith(".docs")) && <FileText className="size-4" />}
                                    {group.latestMessage.originalName?.endsWith(".zip") && <FileArchive className="size-4" />}
                                    <span>Document</span>
                                  </div>
                                </>
                                ) : (
                                  <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            {group.latestMessage.originalName?.endsWith(".pdf") && <File className="size-4" />}
                                            {group.latestMessage.originalName?.endsWith(".ppt") && <AppWindow className="size-4" />}
                                            {(group.latestMessage.originalName?.endsWith(".docx") || group.latestMessage.originalName?.endsWith(".docs")) && <FileText className="size-4" />}
                                            {group.latestMessage.originalName?.endsWith(".zip") && <FileArchive className="size-4" />}
                                            <span>Document</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </>
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 7: Only contact is sent */}
                          {!group.latestMessage.text && group.latestMessage.contact && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <SquareUser className="size-4" />
                                  <div className="flex items-center gap-2">
                                    <span>Contact</span>
                                  </div>
                                </>
                                ) : (
                                  <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <SquareUser className="size-4" />
                                            <span>Contact</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </>
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 8: Both image and text are sent */}
                          {group.latestMessage.text && group.latestMessage.image && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <div className="flex items-center gap-2">
                                    <Camera className="size-4" />
                                    <span>{decryptMessage(group.latestMessage.text)}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Camera className="size-4" />
                                            <span>{decryptMessage(group.latestMessage.text)}</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </> 
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 9: Both voice and text are sent */}
                          {group.latestMessage.text && group.latestMessage.voice && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <div className="flex items-center gap-2">
                                    <Mic className="size-4" />
                                    <span>{decryptMessage(group.latestMessage.text)}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Mic className="size-4" />
                                            <span>{decryptMessage(group.latestMessage.text)}</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </> 
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 10: Both video and text are sent */}
                          {group.latestMessage.text && group.latestMessage.video && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <div className="flex items-center gap-2">
                                    <Video className="size-4" />
                                    <span>{decryptMessage(group.latestMessage.text)}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Video className="size-4" />
                                            <span>{decryptMessage(group.latestMessage.text)}</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </> 
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 11: Both Location and text are sent */}
                          {group.latestMessage.text && group.latestMessage.location && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="size-4" />
                                    <span>{decryptMessage(group.latestMessage.text)}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <MapPin className="size-4" />
                                            <span>{decryptMessage(group.latestMessage.text)}</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </> 
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 12: Both contact and text are sent */}
                          {group.latestMessage.text && group.latestMessage.contact && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <div className="flex items-center gap-2">
                                    <SquareUser className="size-4" />
                                    <span>{decryptMessage(group.latestMessage.text)}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <SquareUser className="size-4" />
                                            <span>{decryptMessage(group.latestMessage.text)}</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </> 
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 13: Both document and text are sent */}
                          {group.latestMessage.text && group.latestMessage.document && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <div className="flex items-center gap-2">
                                    {group.latestMessage.originalName?.endsWith(".pdf") && <File className="size-4" />}
                                    {group.latestMessage.originalName?.endsWith(".ppt") && <AppWindow className="size-4" />}
                                    {(group.latestMessage.originalName?.endsWith(".docx") || group.latestMessage.originalName?.endsWith(".docs")) && <FileText className="size-4" />}
                                    {group.latestMessage.originalName?.endsWith(".zip") && <FileArchive className="size-4" />}
                                    <span>{decryptMessage(group.latestMessage.text)}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            {group.latestMessage.originalName?.endsWith(".pdf") && <File className="size-4" />}
                                            {group.latestMessage.originalName?.endsWith(".ppt") && <AppWindow className="size-4" />}
                                            {(group.latestMessage.originalName?.endsWith(".docx") || group.latestMessage.originalName?.endsWith(".docs")) && <FileText className="size-4" />}
                                            {group.latestMessage.originalName?.endsWith(".zip") && <FileArchive className="size-4" />}
                                            <span>{decryptMessage(group.latestMessage.text)}</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </> 
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 14: Only GIF is sent */}
                          {!group.latestMessage.text && group.latestMessage.gif && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <ImagePlay className="size-4" />
                                  <div className="flex items-center gap-2">
                                    <span>GIF</span>
                                  </div>
                                </>
                                ) : (
                                  <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <ImagePlay className="size-4" />
                                            <span>GIF</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </>
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}

                          {/* Case 12: Both GIF and text are sent */}
                          {group.latestMessage.text && group.latestMessage.gif && (
                            <div className="flex items-center gap-2">
                              {group.latestMessage.senderId === authUser._id ? ( // Check if the sender is the current user
                                <>
                                  <span className="font-medium">You:</span>
                                  <div className="flex items-center gap-2">
                                    <ImagePlay className="size-4" />
                                    <span>{decryptMessage(group.latestMessage.text)}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Debugging: Log the group object and sender */}
                                  {/* {console.log("Group Object:", group)}
                                  {console.log("Sender ID:", group.latestMessage.senderId)}
                                  {console.log("Members:", group.members)} */}

                                  {/* Check if group.members is defined and not empty */}
                                  {group.members && group.members.length > 0 ? (
                                    (() => {
                                      const sender = group.members.find(member => 
                                        member._id && group.latestMessage.senderId && member._id.toString() === group.latestMessage.senderId.toString()
                                      );
                                      // console.log("Sender Found:", sender);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {sender ? sender.fullName : "Unknown User"}:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <ImagePlay className="size-4" />
                                            <span>{decryptMessage(group.latestMessage.text)}</span>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <span>Loading...</span> // You can show a loading message or placeholder here if group.members is undefined or empty
                                  )}
                                </> 
                              )}
                              <span className="text-xs text-zinc-400 ml-2">
                                {group.latestMessage.createdAt
                                  ? formatMessageTime(group.latestMessage.createdAt)
                                  : "Just now"}
                              </span>
                            </div>
                          )}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Modal for creating a group */}
      {isModalOpen && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-base-100 p-5 z-40 border-t border-base-300 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#5A67D8 transparent" }}>
          <div className="flex items-center justify-between gap-2 border-b border-base-300 w-full mb-10">
            <div className="flex items-center gap-2">
              <Users className="size-6" />
              <span className="font-medium hidden lg:block">Create New Group</span>
            </div>
            <button onClick={() => setIsModalOpen(false)} className="flex items-center justify-center">
              <X />
            </button>
          </div>

          <div>
            <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group Name" className="mb-4 p-2 border border-gray-300 rounded w-full"/>

            <input type="text" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} placeholder="Group Description" className="mb-4 p-2 border border-gray-300 rounded w-full"/>
            {/* Search Bar */}
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search for users" className="mb-4 p-2 border border-gray-300 rounded w-full"/>

            {/* Custom Dropdown for Selecting Members */}
            <div className="mb-4">
              <label htmlFor="members" className="block mb-2">Select Members</label>
              <div className="border border-gray-300 p-2 rounded">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div key={user._id} className={`flex items-center justify-between gap-2 mb-2 cursor-pointer pt-2 pb-2 ${selectedMembers.includes(user._id) ? 'bg-base-300' : ''}`}
                      onClick={() => {
                        setSelectedMembers(prev =>
                          prev.includes(user._id)
                            ? prev.filter(id => id !== user._id) // Deselect if already selected
                            : [...prev, user._id] // Select if not already selected
                        );
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="w-8 h-8 rounded-full"/>
                        <span>{user.fullName}</span>
                      </div>
                      {selectedMembers.includes(user._id) && <Check className="text-green-500" />}
                    </div>
                  ))
                ) : (
                  <div>No users found</div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={handleCreateGroup} className="bg-blue-500 text-white px-4 py-2 rounded">Create Group</button>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default GroupSidebar;