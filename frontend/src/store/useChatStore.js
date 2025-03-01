//src/store/useChatStore.js
import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import CryptoJS from "crypto-js";

// AES encryption
const AES_KEY = CryptoJS.SHA256("your_secret_encryption_key");

const encryptMessage = (text) => {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(text, AES_KEY, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).ciphertext.toString(CryptoJS.enc.Hex);
  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted}`;
};

export const decryptMessage = (ciphertext) => {
  // If the ciphertext is not a string or is empty, return it as-is
  if (!ciphertext || typeof ciphertext !== "string") {
    return ciphertext;
  }

  // Check if the ciphertext is in the expected encrypted format (iv:encrypted)
  if (!ciphertext.includes(":")) {
    // If not, assume it's not encrypted and return it as-is
    return ciphertext;
  }

  try {
    const [ivHex, encrypted] = ciphertext.split(":");
    if (!ivHex || !encrypted) {
      // If the format is invalid, return the original ciphertext
      return ciphertext;
    }

    // Parse the IV and encrypted data
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const encryptedWordArray = CryptoJS.enc.Hex.parse(encrypted);

    // Decrypt the message
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: encryptedWordArray }, AES_KEY, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Convert the decrypted data to a UTF-8 string
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

    // If decryption fails (e.g., empty result), return the original ciphertext
    if (!decryptedText) {
      return ciphertext;
    }

    return decryptedText;
  } catch (error) {
    // console.error("Decryption failed:", error);
    return ciphertext; // Return the original ciphertext in case of errors
  }
};

export const useChatStore = create((set, get) => ({
  messages: [],
  groupMessages: [], // Add this line
  users: [],
  usersNotMessaged: [], // Users with whom the logged-in user hasn't messaged
  groups: [], // Add this line
  selectedUser: null,
  selectedGroup: null, // Add this line
  isUsersLoading: false,
  isMessagesLoading: false,
  isGroupsLoading: false, // Add this line
  expiryTime: null, // Add expiryTime to the store
  isUpdatingGroupProfile: false,
  repliedTo: null, // Add repliedTo state
  pinnedMessages: [], // Add this line
  pinnedGroupMessages: [], 
  
  clearSelectedChat: () => set({ selectedUser: null, selectedGroup: null }), // Clear both selected user and group

  setExpiryTime: (time) => set({ expiryTime: time }),

  setUser: (userData) => set({ user: userData }), // Function to set the user

  updateGroupProfilePic: async (groupId, profilePic) => {
    set({ isUpdatingGroupProfile: true }); // Set the loading state to true when the update starts
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/update-profile-pic`, { profilePic });
      
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === groupId ? { ...group, profilePic: res.data.profilePic } : group
        ),
        // Ensure selectedGroup is also updated with the new profilePic
        selectedGroup: state.selectedGroup._id === groupId 
          ? { ...state.selectedGroup, profilePic: res.data.profilePic }
          : state.selectedGroup,
      }));
      toast.success("Profile picture updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile picture");
    } finally {
      set({ isUpdatingGroupProfile: false }); // Reset the loading state to false after the process completes
    }
  },  
  
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      
      // Sort users by latest message timestamp
      const sortedUsers = res.data.sort((a, b) => {
        if (!a.latestMessage || !b.latestMessage) return 0;
        return new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt);
      });

      set({ users: sortedUsers })
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getUsersNotMessaged: async () => {
    set({ isUsersLoading: true });
    try {
      const response = await axiosInstance.get('/messages/notmessagedusers'); // Endpoint to fetch users not messaged
      // console.log("Fetched Users Not Messaged:", response.data); // Log fetched users not messaged
      set({ usersNotMessaged: response.data, isUsersLoading: false });
      return response.data; // Return the data for use in the component
    } catch (error) {
      set({ error: error.message, isUsersLoading: false });
      return []; // Return an empty array in case of error
    }
  },

  deleteChat: async (otherUserId) => {
    try {
      await axiosInstance.delete(`/messages/delete/${otherUserId}`);
      toast.success("Chat deleted successfully!");

      // Clear the selected user and messages
      set({ selectedUser: null, messages: [] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete chat");
    }
  },

  getGroups: async () => {
    set({ isGroupsLoading: true });
  
    try {
      const res = await axiosInstance.get("/groups");
  
      // Ensure decrypted latest messages are stored
      const formattedGroups = res.data.map((group) => ({
        ...group,
        latestMessage: group.latestMessage
          ? { ...group.latestMessage, text: decryptMessage(group.latestMessage.text) }
          : null,
      }));
  
      // Sort groups by the latest message timestamp in descending order
      formattedGroups.sort((a, b) => {
        const aTimestamp = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0); // Use 0 if no message
        const bTimestamp = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0); // Use 0 if no message
        return bTimestamp - aTimestamp; // Sort in descending order
      });

      set({ groups: formattedGroups });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },
  
  createGroup: async (name, description, members) => {
    const { groups } = get(); // Access the current state
    try {
      // Send request to create group
      const res = await axiosInstance.post("/groups", {
        name,
        description,
        members, // Ensure members is an array of user IDs
      });
      
      // Update the store with the newly created group
      set({ groups: [...groups, res.data] });

      toast.success("Group created successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
    }
  },

  setRepliedTo: (messageId) => set({ repliedTo: messageId }), // Add setRepliedTo function

  editMessage: async (messageId, newText) => {
    try {
      const encryptedMessage = encryptMessage(newText);
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, {
        text: encryptedMessage,
      });

      const updatedMessage = res.data;

      // Decrypt the message for the sender before updating state
      const decryptedText = updatedMessage.text ? decryptMessage(updatedMessage.text) : null;

      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, text: decryptedText, isEdited: true } : msg
        ),
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  pinMessage: async (messageId) => {
    try {
      await axiosInstance.post(`/messages/${messageId}/pin`);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, pinned: true } : msg
        ),
        // pinnedMessages: [...state.pinnedMessages, state.messages.find((msg) => msg._id === messageId)],
      }));
      toast.success("Message pinned successfully!");
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to pin message.";
      toast.error(errorMessage);
    }
  },

  unpinMessage: async (messageId) => {
    try {
      await axiosInstance.post(`/messages/${messageId}/unpin`);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, pinned: false } : msg
        ),
        // pinnedMessages: state.pinnedMessages.filter((msg) => msg._id !== messageId),
      }));
      toast.success("Message unpinned successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to unpin message");
    }
  },

  getPinnedMessages: async (userId) => {
    try {
      const res = await axiosInstance.get(`/messages/${userId}/pinned`);
      const decryptedMessages = res.data.map((msg) => ({
        ...msg,
        text: msg.text ? decryptMessage(msg.text) : null, // Decrypt text if it exists
      }));
      set({ pinnedMessages: decryptedMessages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch pinned messages");
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      
      // Decrypt only the text part of the message
      const decryptedMessages = res.data.map((msg) => ({
        ...msg,
        text: decryptMessage(msg.text), // Decrypt only the text
        image: msg.image, // Keep the image URL as is
        voice: msg.voice, // Keep voice URL (This was missing!)
        video: msg.video,
        document: msg.document,
        originalName: msg.originalName, // Pass originalName
        location: msg.location,
        repliedTo: msg.repliedTo, // Ensure repliedTo is included
      }));
      set({ messages: decryptedMessages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (formData) => {
    const { selectedUser, messages, removeMessage, users, repliedTo } = get();
  
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      const newMessage = res.data;
  
      // Decrypt the message for the sender before updating state
      const decryptedText = newMessage.text ? decryptMessage(newMessage.text) : null;
  
      // Handle message expiry
      const loggedInUser = users.find((user) => user._id === newMessage.senderId);
      const disappearSetting = loggedInUser?.disappearSettings?.[selectedUser._id];
      const expiry = disappearSetting === "off" || !disappearSetting
        ? null
        : parseInt(disappearSetting.replace("min", "")); // Remove "min" from the string
  
      if (expiry && expiry !== null) {
        setTimeout(() => {
          removeMessage(newMessage._id);
        }, expiry * 60000); // Convert minutes to milliseconds
      }
    } catch (error) {
      // console.error("Failed to send message:", error);
      if (error.response) {
        toast.error(error.response.data.error || "Failed to send message. Please try again.");
      } else {
        toast.error("Network error. Please check your connection.");
      }
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, selectedGroup, removeMessage } = get();
    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const decryptedText = decryptMessage(newMessage.text);
      // console.log("New Message Received:", newMessage); // Log the new message
  
      // Update the users state with the new message
      set((state) => {
        const updatedUsers = state.users.map((user) =>
          user._id === newMessage.senderId || user._id === newMessage.receiverId
            ? { ...user, latestMessage: { ...newMessage, text: decryptedText } }
            : user
        );
  
        // Re-sort users by latest message timestamp
        const sortedUsers = updatedUsers.sort((a, b) => {
          if (!a.latestMessage || !b.latestMessage) return 0;
          return new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt);
        });
  
        return { users: sortedUsers };
      });
  
      // Update messages for the selected user
      if (get().selectedUser && (newMessage.senderId === get().selectedUser._id || newMessage.receiverId === get().selectedUser._id)) {
        set((state) => ({
          messages: [...state.messages, { ...newMessage, text: decryptedText }],
        }));
      }
  
      // Handle message expiry
      if (newMessage.expiresAt) {
        const timeLeft = new Date(newMessage.expiresAt).getTime() - Date.now();
        if (timeLeft > 0) {
          setTimeout(() => {
            removeMessage(newMessage._id);
          }, timeLeft);
        } else {
          removeMessage(newMessage._id);
        }
      }
    });
    
    socket.on("messageReaction", (updatedMessage) => {
      set((state) => ({
        users: state.users.map((user) =>
          user.latestMessage && user.latestMessage._id === updatedMessage._id
            ? { ...user, latestMessage: { ...user.latestMessage, reactions: updatedMessage.reactions } }
            : user
        ),
        messages: state.messages.map((msg) =>
          msg._id.toString() === updatedMessage._id.toString()
            ? { ...msg, reactions: { ...updatedMessage.reactions } } // Ensure immutability
            : msg
        ),
      }));
    });
  
    socket.on("messagePinned", (pinnedMessage) => {
      set((state) => ({
        users: state.users.map((user) =>
          user.latestMessage && user.latestMessage._id === pinnedMessage._id
            ? { ...user, latestMessage: { ...user.latestMessage, isPinned: true } }
            : user
        ),
        pinnedMessages: [...state.pinnedMessages, pinnedMessage],
      }));
    });
  
    socket.on("messageUnpinned", (unpinnedMessage) => {
      set((state) => ({
        users: state.users.map((user) =>
          user.latestMessage && user.latestMessage._id === unpinnedMessage._id
            ? { ...user, latestMessage: { ...user.latestMessage, isPinned: false } }
            : user
        ),
        pinnedMessages: state.pinnedMessages.filter((msg) => msg._id !== unpinnedMessage._id),
      }));
    });
  
    socket.on("messageUpdated", (updatedMessage) => {
      const decryptedText = decryptMessage(updatedMessage.text);
      set((state) => ({
        users: state.users.map((user) =>
          user.latestMessage && user.latestMessage._id === updatedMessage._id
            ? { ...user, latestMessage: { ...user.latestMessage, text: decryptedText, isEdited: true } }
            : user
        ),
        messages: state.messages.map((msg) =>
          msg._id === updatedMessage._id ? { ...msg, text: decryptedText, isEdited: true } : msg
        ),
      }));
    });
  
    socket.on("messageRead", ({ messageId, readBy }) => {
      set((state) => ({
        users: state.users.map((user) => {
          if (user.latestMessage && user.latestMessage._id === messageId) {
            return {
              ...user,
              latestMessage: {
                ...user.latestMessage,
                readBy,
              },
            };
          }
          return user;
        }),
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, readBy } : msg
        ),
      }));
    });  
  
    socket.on("newGroupMessage", (newMessage) => {
      const decryptedText = decryptMessage(newMessage.text);
      if (get().selectedGroup && newMessage.groupId === get().selectedGroup._id) {
        set((state) => ({
          groupMessages: [...state.groupMessages, { ...newMessage, text: decryptedText }],
        }));
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageReaction");
    socket.off("messagePinned");
    socket.off("messageUnpinned");
    socket.off("messageUpdated");
    socket.off("messageRead");
    socket.off("newGroupMessage");
  },

  useSidebarUsers: () => {
    return useChatStore((state) => state.users);
  },

  getUsersForContact: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      // console.log("users",res);
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`groups/messages/group/${groupId}`);
      const decryptedMessages = res.data.map((msg) => ({
        ...msg,
        text: decryptMessage(msg.text),
        image: msg.image,
        voice: msg.voice, // Keep voice URL (This was missing!)
        video: msg.video,
      }));
      set({ groupMessages: decryptedMessages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch group messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  
  sendGroupMessage: async (formData) => {
    const { selectedGroup, groupMessages, removeMessage, users, repliedTo } = get();
  
    try {
      const res = await axiosInstance.post(`/groups/messages/group/send/${selectedGroup._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      if (!res.data) {
        throw new Error("No data received from the server");
      }
  
      const newMessage = res.data;
      // console.log("Response received:", newMessage);
  
      // Decrypt the message for the sender before updating state
      const decryptedText = newMessage.text ? decryptMessage(newMessage.text) : null;
  
      // If expiry is set, handle message removal
      const loggedInUser = users.find((user) => user._id === newMessage.senderId);
      const disappearSetting = loggedInUser?.disappearSettings?.[selectedGroup._id];
      const expiry = disappearSetting === "off" || !disappearSetting
        ? null
        : parseInt(disappearSetting.replace("min", "")); // Remove "min" from the string
  
      if (expiry && expiry !== null) {
        setTimeout(() => {
          removeMessage(newMessage._id);
        }, expiry * 60000); // Convert minutes to milliseconds
      }
    } catch (error) {
      // console.error("Error in sendGroupMessage:", error);
      toast.error(error.response?.data?.error || error.message || "Failed to send group message useChatStore");
    }
  },

  editGroupMessage: async (messageId, newText) => {
    try {
      const encryptedMessage = encryptMessage(newText); // Encrypt the message
      const res = await axiosInstance.put(`/groups/messages/group/edit/${messageId}`, {
        text: encryptedMessage,
      });
  
      const updatedMessage = res.data;
  
      // Decrypt the message for the sender before updating state
      const decryptedText = updatedMessage.text ? decryptMessage(updatedMessage.text) : null;
  
      set((state) => ({
        groupMessages: state.groupMessages.map((msg) =>
          msg._id === messageId ? { ...msg, text: decryptedText, isEdited: true } : msg
        ),
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit group message");
    }
  },

  pinGroupMessage: async (messageId) => {
    try {
      await axiosInstance.post(`/groups/messages/group/${messageId}/pin`);
      set((state) => ({
        groupMessages: state.groupMessages.map((msg) =>
          msg._id === messageId ? { ...msg, pinned: true } : msg
        ),
      }));
      toast.success("Group message pinned successfully!");
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to pin group message.";
      toast.error(errorMessage);
    }
  },
  
  unpinGroupMessage: async (messageId) => {
    try {
      await axiosInstance.post(`/groups/messages/group/${messageId}/unpin`);
      set((state) => ({
        groupMessages: state.groupMessages.map((msg) =>
          msg._id === messageId ? { ...msg, pinned: false } : msg
        ),
      }));
      toast.success("Group message unpinned successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to unpin group message");
    }
  },

  getPinnedGroupMessages: async (groupId) => {
    try {
      const res = await axiosInstance.get(`/groups/messages/group/${groupId}/pinned`);
      // console.log(res);
      const decryptedMessages = res.data.map((msg) => ({
        ...msg,
        text: msg.text ? decryptMessage(msg.text) : null, // Decrypt text if it exists
      }));
      set({ pinnedGroupMessages: decryptedMessages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch pinned group messages");
    }
  },

  checkIfUserIsAdmin: async (groupId) => {
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/is-admin`);
      return res.data.isAdmin;
    } catch (error) {
      // console.error("Error checking admin status:", error);
      return false;
    }
  },

  subscribeToGroupMessages: () => {
    const socket = useAuthStore.getState().socket;

    socket.on("newGroupCreated", (newGroup) => {
      // console.log("Received newGroupCreated event:", newGroup);
      set((state) => {
          // console.log("Updating groups state with new group:", newGroup);
          return {
              groups: [newGroup, ...state.groups],
          };
      });
    });

    socket.on("userRemovedFromGroup", ({ groupId }) => {
      // console.log("Received userRemovedFromGroup event for groupId:", groupId);
      set((state) => {
        // console.log("Removing group from state for removed user:", groupId);
        return {
          groups: state.groups.filter((group) => group._id.toString() !== groupId.toString()),
        };
      });
    });

    socket.on("userAddedToGroup", (newGroup) => {
      // console.log("Received userAddedToGroup event:", newGroup);
      set((state) => {
        // Check if the group already exists in the state
        const groupExists = state.groups.some((group) => group._id === newGroup._id);
    
        // If the group does not exist, add it to the state
        if (!groupExists) {
          // console.log("Adding group to state for added user:", newGroup);
          return {
            groups: [newGroup, ...state.groups],
          };
        }
    
        // If the group already exists, return the current state
        // console.log("Group already exists in state:", newGroup);
        return state;
      });
    });
    
    socket.on("membersAddedToGroup", (updatedGroup) => {
      // console.log("Received membersAddedToGroup event:", updatedGroup);
      set((state) => {
        // console.log("Updating groups state with added members:", updatedGroup);
        return {
          groups: state.groups.map((group) =>
            group._id.toString() === updatedGroup._id.toString() ? updatedGroup : group
          ),
        };
      });
    });
    
    socket.on("membersRemovedFromGroup", (updatedGroup) => {
      // console.log("Received membersRemovedFromGroup event:", updatedGroup);
      set((state) => {
        // console.log("Updating groups state with removed members:", updatedGroup);
        return {
          groups: state.groups.map((group) =>
            group._id.toString() === updatedGroup._id.toString() ? updatedGroup : group
          ),
        };
      });
    });
    
    socket.on("groupDeleted", ({ groupId }) => {
      // console.log("Received groupDeleted event for groupId:", groupId);
      set((state) => {
        // console.log("Removing group from state:", groupId);
        return {
          groups: state.groups.filter((group) => group._id.toString() !== groupId.toString()),
        };
      });
    });
    
    socket.on("newGroupMessage", (newMessage) => {
      const decryptedText = decryptMessage(newMessage.text);
      // console.log("New Group Message Received:", newMessage); // Log the new message
    
      // Update the group messages list and groups state in real-time
      set((state) => {
        // Update the groupMessages state
        const updatedGroupMessages = [...state.groupMessages, { ...newMessage, text: decryptedText }];
    
        // Update the groups state with the latest message
        const updatedGroups = state.groups.map((group) =>
          group._id === newMessage.groupId
            ? { ...group, latestMessage: { ...newMessage, text: decryptedText } }
            : group
        );
    
        // Sort groups by the latest message timestamp
        const sortedGroups = updatedGroups.sort((a, b) => {
          const aTimestamp = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0);
          const bTimestamp = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0);
          return bTimestamp - aTimestamp; // Sort in descending order
        });
    
        return {
          groupMessages: updatedGroupMessages,
          groups: sortedGroups,
        };
      });
    
      // Handle expiring messages
      if (newMessage.expiresAt) {
        const timeLeft = new Date(newMessage.expiresAt).getTime() - Date.now();
        if (timeLeft > 0) {
          setTimeout(() => {
            removeMessage(newMessage._id);
          }, timeLeft);
        } else {
          removeMessage(newMessage._id);
        }
      }
    });
  
    // Handle message reactions in group messages
    socket.on("groupMessageReaction", (updatedMessage) => {
      set((state) => ({
        groups: state.groups.map((group) =>
          group.latestMessage && group.latestMessage._id === updatedMessage._id
            ? { ...group, latestMessage: { ...group.latestMessage, reactions: updatedMessage.reactions } }
            : group
        ),
        groupMessages: state.groupMessages.map((msg) =>
          msg._id.toString() === updatedMessage._id.toString()
            ? { ...msg, reactions: { ...updatedMessage.reactions } } // Ensure immutability
            : msg
        ),
      }));
    });
  
    // Handle pinned group messages
    socket.on("groupMessagePinned", (pinnedMessage) => {
      set((state) => ({
        groups: state.groups.map((group) =>
          group.latestMessage && group.latestMessage._id === pinnedMessage._id
            ? { ...group, latestMessage: { ...group.latestMessage, isPinned: true } }
            : group
        ),
        pinnedGroupMessages: [...state.pinnedGroupMessages, pinnedMessage],
      }));
    });
  
    // Handle unpinned group messages
    socket.on("groupMessageUnpinned", (unpinnedMessage) => {
      set((state) => ({
        groups: state.groups.map((group) =>
          group.latestMessage && group.latestMessage._id === unpinnedMessage._id
            ? { ...group, latestMessage: { ...group.latestMessage, isPinned: false } }
            : group
        ),
        pinnedGroupMessages: state.pinnedGroupMessages.filter((msg) => msg._id !== unpinnedMessage._id),
      }));
    });
  
    // Handle updated group messages
    socket.on("groupMessageUpdated", (updatedMessage) => {
      const decryptedText = decryptMessage(updatedMessage.text);
      set((state) => ({
        groups: state.groups.map((group) =>
          group.latestMessage && group.latestMessage._id === updatedMessage._id
            ? { ...group, latestMessage: { ...group.latestMessage, text: decryptedText, isEdited: true } }
            : group
        ),
        groupMessages: state.groupMessages.map((msg) =>
          msg._id === updatedMessage._id ? { ...msg, text: decryptedText, isEdited: true } : msg
        ),
      }));
    });
  
    // Handle read receipts for group messages
    socket.on("groupMessageRead", ({ messageId, readBy }) => {
      set((state) => ({
        groups: state.groups.map((group) => {
          if (group.latestMessage && group.latestMessage._id === messageId) {
            return {
              ...group,
              latestMessage: {
                ...group.latestMessage,
                readBy,
              },
            };
          }
          return group;
        }),
        groupMessages: state.groupMessages.map((msg) =>
          msg._id === messageId ? { ...msg, readBy } : msg
        ),
      }));
    });
  },
  
  // Unsubscribe from group messages
  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    // Listen for new group events
    socket.off("newGroupCreated");
    socket.off("membersAddedToGroup");
    socket.off("membersRemovedFromGroup");
    socket.off("groupDeleted");
    socket.off("newGroupMessage");
    socket.off("groupMessageReaction");
    socket.off("groupMessagePinned");
    socket.off("groupMessageUnpinned");
    socket.off("groupMessageUpdated");
    socket.off("groupMessageRead");
  },

  addMembersToGroup: async (groupId, members) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/add-members`, { members });
  
      set((state) => ({
        groups: state.groups.map(group =>
          group._id === groupId 
            ? { 
                ...group, 
                members: res.data.members, 
                admin: res.data.admin  // Ensure admin list is synced
              } 
            : group
        ),
        selectedGroup: state.selectedGroup._id === groupId
          ? { 
              ...state.selectedGroup, 
              members: res.data.members, 
              admin: res.data.admin  // Ensure admin list is synced
            }
          : state.selectedGroup,
      }));
      toast.success("Members added successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add members");
    }
  },  

  removeMembersFromGroup: async (groupId, members) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/remove-members`, { members });
      
      set((state) => ({
        groups: state.groups.map(group =>
          group._id === groupId 
            ? { 
                ...group, 
                members: res.data.members, 
                admin: group.admin.filter(adminId => !members.some(member => member._id === adminId))  // Remove admin if member is removed
              }
            : group
        ),
        selectedGroup: state.selectedGroup._id === groupId
          ? { 
              ...state.selectedGroup, 
              members: res.data.members, 
              admin: state.selectedGroup.admin.filter(adminId => !members.some(member => member._id === adminId))  // Sync admin list
            }
          : state.selectedGroup,
      }));
      toast.success("Members removed successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove members");
    }
  },
  
  makeAdmin: async (groupId, newAdminId) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/make-admin`, { newAdminId });
  
      set((state) => ({
        groups: state.groups.map(group =>
          group._id === groupId 
            ? { 
                ...group, 
                admin: res.data.admin  // Sync admin list from backend
              }
            : group
        ),
        selectedGroup: state.selectedGroup._id === groupId
          ? { 
              ...state.selectedGroup, 
              admin: res.data.admin  // Sync admin list from backend
            }
          : state.selectedGroup,
      }));
      toast.success("New admin assigned successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign new admin");
    }
  },  

  removeAdmin: async (groupId, adminId) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/remove-admin`, { adminId });
  
      set((state) => ({
        groups: state.groups.map(group =>
          group._id === groupId
            ? {
                ...group,
                admin: res.data.admin, // Sync admin list from backend
              }
            : group
        ),
        selectedGroup: state.selectedGroup._id === groupId
          ? {
              ...state.selectedGroup,
              admin: res.data.admin, // Sync admin list from backend
            }
          : state.selectedGroup,
      }));
      toast.success("Admin removed successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove admin");
    }
  },
  
  updateGroupDetails: async (groupId, name, description) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/update-group-info`, { name, description });
  
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === groupId
            ? { 
                ...group, 
                name: res.data.name, 
                description: res.data.description 
              }
            : group
        ),
        selectedGroup: state.selectedGroup._id === groupId
          ? { 
              ...state.selectedGroup, 
              name: res.data.name, 
              description: res.data.description 
            }
          : state.selectedGroup,
      }));
  
      toast.success("Group details updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group details");
    }
  },

  deleteGroup: async (groupId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}/delete`); // Using DELETE method
      set((state) => ({
        groups: state.groups.filter(group => group._id !== groupId),
        selectedGroup: state.selectedGroup._id === groupId ? null : state.selectedGroup, // Deselect the group if it's deleted
      }));
      toast.success("Group deleted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
    }
  },
  
  
  setSelectedUser: (selectedUser) => set({ selectedUser }),
  setSelectedGroup: (selectedGroup) => set({ selectedGroup }), // Add this line
  setGroupMessages: (selectedMessages) => set({selectedMessages}),

  removeMessage: (messageId) => {
    set((state) => {
      // Remove the message from the messages array (for ChatContainer)
      const updatedMessages = state.messages.filter((msg) => msg._id !== messageId);
  
      // Remove the message from the groupMessages array (for GroupChatContainer)
      const updatedGroupMessages = state.groupMessages.filter((msg) => msg._id !== messageId);
  
      // Update the users array to remove the latestMessage if it matches the deleted message (for Sidebar)
      const updatedUsers = state.users.map((user) => {
        if (user.latestMessage && user.latestMessage._id === messageId) {
          // Find the next latest message for this user
          const userMessages = updatedMessages.filter(
            (msg) => msg.senderId === user._id || msg.receiverId === user._id
          );
  
          // Find the most recent message
          let nextLatestMessage = null;
          if (userMessages.length > 0) {
            nextLatestMessage = userMessages.reduce((latest, msg) => {
              if (!latest || new Date(msg.createdAt) > new Date(latest.createdAt)) {
                return msg;
              }
              return latest;
            }, null);
          }
  
          return { ...user, latestMessage: nextLatestMessage }; // Update the latestMessage
        }
        return user;
      });
  
      // Update the groups array to remove the latestMessage if it matches the deleted message (for Sidebar)
      const updatedGroups = state.groups.map((group) => {
        if (group.latestMessage && group.latestMessage._id === messageId) {
          // Find the next latest message for this group
          const groupMessages = updatedGroupMessages.filter(
            (msg) => msg.groupId === group._id
          );
  
          // Find the most recent message
          let nextLatestMessage = null;
          if (groupMessages.length > 0) {
            nextLatestMessage = groupMessages.reduce((latest, msg) => {
              if (!latest || new Date(msg.createdAt) > new Date(latest.createdAt)) {
                return msg;
              }
              return latest;
            }, null);
          }
  
          return { ...group, latestMessage: nextLatestMessage }; // Update the latestMessage
        }
        return group;
      });
  
      return {
        messages: updatedMessages,
        groupMessages: updatedGroupMessages,
        users: updatedUsers,
        groups: updatedGroups,
      };
    });
  },
}));