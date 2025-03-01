//controllers/message.controller.js
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import crypto from "crypto";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import mongoose from "mongoose";

const ENCRYPTION_KEY = crypto.createHash("sha256").update("your_secret_encryption_key").digest();
const IV_LENGTH = 16;

export const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

export const decrypt = (encryptedText) => {
  try {
    // If encryptedText is null or empty, return an empty string or null
    if (!encryptedText) return null;

    const [ivHex, encrypted] = encryptedText.split(":");
    if (!ivHex || !encrypted) throw new Error("Invalid encrypted text format");

    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // console.error("Decryption error:", error);
    return "Decryption error";
  }
};


export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Find all users except the logged-in user
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    // For each user, get the latest message
    const usersWithLatestMessage = await Promise.all(filteredUsers.map(async (user) => {
      const latestMessage = await Message.findOne({
        $or: [
          { senderId: loggedInUserId, receiverId: user._id },
          { senderId: user._id, receiverId: loggedInUserId },
        ]
      }).sort({ createdAt: -1 }); // Sort by createdAt to get the latest message

      if (latestMessage) {
        // Decrypt the latest message text before returning it
        latestMessage.text = decrypt(latestMessage.text);
      }

      return {
        ...user.toObject(),
        latestMessage: latestMessage || null,
      };
    }));

    // Filter out users who have no messages
    const usersWithMessages = usersWithLatestMessage.filter(user => user.latestMessage !== null);

    // Sort users by the latest message timestamp in descending order
    usersWithMessages.sort((a, b) => {
      if (!a.latestMessage || !b.latestMessage) return 0; // Handle null cases
      return new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt);
    });

    // Return only users with messages, sorted by latest message timestamp
    res.status(200).json(usersWithMessages);
  } catch (error) {
    // console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUsersNotMessaged = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Find all users except the logged-in user
    const allUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    // Find users with whom the logged-in user has exchanged messages
    const usersWithMessages = await Message.distinct("receiverId", { senderId: loggedInUserId });
    const usersWithMessages2 = await Message.distinct("senderId", { receiverId: loggedInUserId });
    const messagedUserIds = [...new Set([...usersWithMessages, ...usersWithMessages2])];

    // console.log("Messaged User IDs:", messagedUserIds); // Debugging

    // Filter out users who have not messaged the logged-in user
    const usersNotMessaged = allUsers.filter(user => !messagedUserIds.some(id => id.equals(user._id)));

    // console.log("Users Not Messaged:", usersNotMessaged); // Debugging

    res.status(200).json(usersNotMessaged);
  } catch (error) {
    // console.error("Error in getUsersNotMessaged: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    const decryptedMessages = messages.map((msg) => ({
      ...msg.toObject(),
      text: decrypt(msg.text),
      reactions: msg.reactions instanceof Map ? Object.fromEntries(msg.reactions) : msg.reactions,
    }));

    res.status(200).json(decryptedMessages);
  } catch (error) {
    // console.error("Error in getMessages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    // console.log("Request Body:", req.body);
    // console.log("Request Files:", req.files);

    const { text, location, repliedTo, originalName, gif } = req.body;
    const contact = req.body.contact ? JSON.parse(req.body.contact) : null; // ✅ Convert JSON string to object

    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !req.files?.image && !req.files?.voice && !req.files?.video && !req.files?.document && !location && !contact && !gif) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    let imageUrl = null;
    let voiceUrl = null;
    let videoUrl = null;
    let documentUrl = null;

    // Upload image if available
    if (req.files?.image) {
      const imageFile = req.files.image[0];
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "image", folder: "chat_images" },
          (error, result) => {
            if (error) {
              // console.error("Cloudinary upload error:", error);
              reject(error);
            } else {
              // console.log("Cloudinary upload success:", result);
              resolve(result);
            }
          }
        );
        stream.end(imageFile.buffer);
      });
      imageUrl = uploadResult.secure_url;
    }

    // Upload voice if available
    if (req.files?.voice) {
      const voiceFile = req.files.voice[0];
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "video", folder: "chat_voices" }, // Use "video" for audio files in Cloudinary
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(voiceFile.buffer);
      });
      voiceUrl = uploadResult.secure_url;
    }

    // Upload video if available
    if (req.files?.video) {
      const videoFile = req.files.video[0];
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "video", folder: "chat_videos" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(videoFile.buffer);
      });
      videoUrl = uploadResult.secure_url;
    }

    // Upload document if available
    if (req.files?.document) {
      const documentFile = req.files.document[0];
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "raw", folder: "chat_documents" }, // Use "raw" for documents
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(documentFile.buffer);
      });
      documentUrl = uploadResult.secure_url;
    }

    let locationData = null;
    if (location) {
      try {
        locationData = JSON.parse(location);
        if (!locationData.type || !locationData.coordinates) {
          return res.status(400).json({ error: "Location type and coordinates are required" });
        }
      } catch (error) {
        return res.status(400).json({ error: "Invalid location data" });
      }
    }

    let contactData = null;
    // if (contact) {
    //   try {
    //     const contactUser = await User.findById(contact);
    //     if (contactUser) {
    //       contactData = {
    //         userId: contactUser._id,
    //         fullName: contactUser.fullName,
    //         profilePic: contactUser.profilePic, // Include profilePic if needed
    //       };
    //     }
    //   } catch (error) {
    //     return res.status(400).json({ error: "Invalid contact data" });
    //   }
    // }

    if (contact && contact.userId) {
      try {
        const contactUser = await User.findById(contact.userId); // ✅ Use contact.userId, not contact directly
        if (!contactUser) {
          return res.status(400).json({ error: "Contact not found" });
        }
        contactData = {
          userId: contactUser._id,
          fullName: contactUser.fullName,
          profilePic: contactUser.profilePic,
        };
      } catch (error) {
        return res.status(400).json({ error: "Invalid contact ID format" });
      }
    }

    // Fetch disappearSettings for the sender
    const sender = await User.findById(senderId).select("disappearSettings");

    let expiresAt = null;
    const disappearSetting = sender?.disappearSettings?.get(receiverId) || "off";
    if (disappearSetting !== "off") {
      const expiryMinutes = parseInt(disappearSetting.replace("min", ""));
      if (!isNaN(expiryMinutes)) {
        expiresAt = new Date(Date.now() + expiryMinutes * 60000);
      }
    }

    const encryptedText = text ? encrypt(text) : null;

    const newMessage = new Message({
      senderId,
      receiverId,
      text: encryptedText,
      image: imageUrl,
      voice: voiceUrl,
      video: videoUrl,
      document: documentUrl,
      originalName: originalName || null,
      location: locationData,
      contact: contactData,
      expiresAt,
      repliedTo,
      gif, // Add GIF URL to the message

    });

    await newMessage.save();

    const serializedMessage = {
      ...newMessage.toObject(),
      _id: newMessage._id.toString(),
      senderId: newMessage.senderId.toString(),
      receiverId: newMessage.receiverId.toString(),
      createdAt: newMessage.createdAt.toISOString(),
      updatedAt: newMessage.updatedAt.toISOString(),
      expiresAt: newMessage.expiresAt ? newMessage.expiresAt.toISOString() : null,
      repliedTo: newMessage.repliedTo ? newMessage.repliedTo.toString() : null,
      reactions: newMessage.reactions ? Object.fromEntries(newMessage.reactions) : {},
      gif: newMessage.gif, // Include GIF URL in the response
    };

    const decryptedText = serializedMessage.text ? decrypt(serializedMessage.text) : null;
    serializedMessage.text = decryptedText;

    // Notify receiver and sender about the new message
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", serializedMessage);
    }

    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("newMessage", serializedMessage);
    }

    // console.log("Receiver Socket ID:", receiverSocketId);
    // console.log("Sender Socket ID:", senderSocketId);

    res.status(201).json({
      ...newMessage.toObject(),
      expiresAt: newMessage.expiresAt ? newMessage.expiresAt.toISOString() : null,
      text: decryptedText,
      repliedTo: newMessage.repliedTo ? newMessage.repliedTo.toString() : null,
    });
  } catch (error) {
    // console.error("Error in sendMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const encryptedText = encrypt(text);

    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { text: encryptedText, isEdited: true },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ error: "Message not found" });
    }

    const serializedMessage = {
      ...updatedMessage.toObject(),
      _id: updatedMessage._id.toString(),
      senderId: updatedMessage.senderId.toString(),
      receiverId: updatedMessage.receiverId.toString(),
      createdAt: updatedMessage.createdAt.toISOString(),
      updatedAt: updatedMessage.updatedAt.toISOString(),
      expiresAt: updatedMessage.expiresAt ? updatedMessage.expiresAt.toISOString() : null,
      repliedTo: updatedMessage.repliedTo ? updatedMessage.repliedTo.toString() : null,
      reactions: updatedMessage.reactions ? Object.fromEntries(updatedMessage.reactions) : {},
      isEdited: updatedMessage.isEdited,
    };

    const decryptedText = serializedMessage.text ? decrypt(serializedMessage.text) : null;
    serializedMessage.text = decryptedText;

    // Notify receiver and sender about the updated message
    const receiverSocketId = getReceiverSocketId(updatedMessage.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageUpdated", serializedMessage);
    }

    const senderSocketId = getReceiverSocketId(updatedMessage.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageUpdated", serializedMessage);
    }

    res.status(200).json(serializedMessage);
  } catch (error) {
    // console.error("Error in editMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Find the message and update the readBy array
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Add the user to the readBy array if not already present
    if (!message.readBy.includes(userId)) {
      message.readBy.push(userId);
      await message.save();

      // Notify the sender that the message has been read
      const senderSocketId = getReceiverSocketId(message.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageRead", { messageId, readBy: message.readBy });
      }
    }

    res.status(200).json({ message: "Message marked as read" });
  } catch (error) {
    // console.error("Error in markMessageAsRead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if the maximum number of pinned messages (3) has been reached
    const pinnedMessagesCount = await Message.countDocuments({
      $or: [
        { senderId: message.senderId, receiverId: message.receiverId },
        { senderId: message.receiverId, receiverId: message.senderId },
      ],
      pinned: true,
    });

    if (pinnedMessagesCount >= 3) {
      return res.status(400).json({ error: "Maximum of 3 pinned messages allowed" });
    }

    message.pinned = true;
    await message.save();

    // Emit socket event for real-time updates
    const updatedMessage = {
      ...message.toObject(),
      text: message.text ? decrypt(message.text) : null, // Decrypt the message text if it exists
    };

    // Notify receiver and sender about the new pinned message
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messagePinned", updatedMessage);
    }

    const senderSocketId = getReceiverSocketId(message.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagePinned", updatedMessage);
    }

    res.status(200).json(updatedMessage);
  } catch (error) {
    // console.error("Error in pinMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const unpinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    message.pinned = false;
    await message.save();

    // Emit socket event for real-time updates
    const updatedMessage = {
      ...message.toObject(),
      text: message.text ? decrypt(message.text) : null, // Decrypt the message text if it exists
    };

    // Notify receiver and sender about the unpinned message
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageUnpinned", updatedMessage);
    }

    const senderSocketId = getReceiverSocketId(message.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageUnpinned", updatedMessage);
    }

    res.status(200).json(updatedMessage);
  } catch (error) {
    // console.error("Error in unpinMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPinnedMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const pinnedMessages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      pinned: true,
    });

    const decryptedMessages = pinnedMessages.map((msg) => ({
      ...msg.toObject(),
      text: decrypt(msg.text),
      reactions: msg.reactions instanceof Map ? Object.fromEntries(msg.reactions) : msg.reactions,
    }));

    res.status(200).json(decryptedMessages);
  } catch (error) {
    // console.error("Error in getPinnedMessages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Initialize the reactions Map if it doesn't exist
    if (!message.reactions) {
      message.reactions = new Map();
    }

    // Remove the user's existing reaction (if any)
    for (const [existingEmoji, userIds] of message.reactions.entries()) {
      if (userIds.includes(userId)) {
        const updatedReactions = userIds.filter((id) => id.toString() !== userId.toString());

        if (updatedReactions.length === 0) {
          // If no users have reacted with this emoji, remove the emoji entry
          message.reactions.delete(existingEmoji);
        } else {
          // Otherwise, update the reactions for the emoji
          message.reactions.set(existingEmoji, updatedReactions);
        }
      }
    }

    // Add the new reaction
    const userReactions = message.reactions.get(emoji) || [];
    message.reactions.set(emoji, [...userReactions, userId]);

    await message.save();

    // Notify receiver and sender about the new message reaction
    const updatedMessage = {
      ...message.toObject(),
      reactions: message.reactions ? Object.fromEntries(message.reactions) : {},
    };

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageReaction", updatedMessage);
    }

    const senderSocketId = getReceiverSocketId(message.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageReaction", updatedMessage);
    }

    res.status(200).json({ message: "Reaction updated", removed: false });
  } catch (error) {
    // console.error("Error in reactToMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getreactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!messageId) {
      return res.status(400).json({ error: "Message ID is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if there are reactions
    if (!message.reactions || message.reactions.size === 0) {
      return res.status(200).json({});
    }

    // Extract unique user IDs from reactions
    const reactionUserIds = [...new Set(Array.from(message.reactions.values()).flat())];

    // Fetch users
    // const users = await User.find({ _id: { $in: reactionUserIds } });

    // Fetch users with their _id, fullName, and profilePic
    const users = await User.find(
      { _id: { $in: reactionUserIds } },
      { _id: 1, fullName: 1, profilePic: 1 } // Include only necessary fields
    );

    // Structure the response to segregate emojis with users' details
    const reactionsWithUsers = {};
    for (const [emoji, userIds] of message.reactions.entries()) {
      reactionsWithUsers[emoji] = users
        .filter((user) => userIds.includes(user._id.toString()))
        .map((user) => ({
          _id: user._id, // Include the _id field
          fullName: user.fullName,
          profilePic: user.profilePic,
        }));
    }

    return res.status(200).json(reactionsWithUsers);
  } catch (error) {
    // console.error("Error fetching reaction users:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji, userId } = req.body;

    // Validate messageId and userId
    if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid messageId or userId" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if the message has reactions
    if (!message.reactions || !message.reactions.has(emoji)) {
      return res.status(404).json({ error: "Reaction not found" });
    }

    // Get the list of users who reacted with the given emoji
    const userReactions = message.reactions.get(emoji);

    // Check if the user has reacted with the given emoji
    if (!userReactions.includes(userId)) {
      return res.status(403).json({ error: "You are not authorized to remove this reaction" });
    }

    // Remove the user's reaction
    const updatedReactions = userReactions.filter((id) => id.toString() !== userId.toString());

    if (updatedReactions.length === 0) {
      // If no users have reacted with this emoji, remove the emoji entry
      message.reactions.delete(emoji);
    } else {
      // Otherwise, update the reactions for the emoji
      message.reactions.set(emoji, updatedReactions);
    }

    await message.save();

    // Notify receiver and sender about the updated message
    const updatedMessage = {
      ...message.toObject(),
      reactions: message.reactions ? Object.fromEntries(message.reactions) : {},
    };

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageReaction", updatedMessage);
    }

    const senderSocketId = getReceiverSocketId(message.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageReaction", updatedMessage);
    }

    res.status(200).json({ message: "Reaction removed", removed: true });
  } catch (error) {
    // console.error("Error in removeReaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { id: otherUserId } = req.params; // ID of the other user
    const myId = req.user._id; // ID of the logged-in user

    // Delete all messages between the two users
    await Message.deleteMany({
      $or: [
        { senderId: myId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: myId },
      ],
    });

    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (error) {
    // console.error("Error in deleteChat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getChatMedia = async (req, res) => {
  try {
    const { userToChatId } = req.params;
    const myId = req.user._id;
    const { page = 1, limit = 10, filter = "all" } = req.query;

    if (!userToChatId) {
      return res.status(400).json({ error: "userToChatId is required" });
    }

    const skip = (page - 1) * limit;

    // Build query to fetch only media messages from the correct chat
    const mediaConditions = [
      { image: { $ne: null } },
      { gif: { $ne: null } },
      { video: { $ne: null } },
      { document: { $ne: null } },
      { audio: { $ne: null } }
    ];

    if (filter !== "all") {
      mediaConditions.length = 0; // Reset array to apply specific filter
      mediaConditions.push({ [filter]: { $ne: null } });
    }

    const mediaQuery = {
      $and: [
        {
          $or: [
            { senderId: myId, receiverId: userToChatId },
            { senderId: userToChatId, receiverId: myId }
          ]
        },
        { $or: mediaConditions } // Ensures media messages only
      ]
    };

    const chatMessages = await Message.find(mediaQuery)
      .skip(skip)
      .limit(Number(limit))
      .populate("senderId", "fullName profilePic _id")
      .sort({ createdAt: -1 });

    // Format document messages to include originalName
    const formattedMessages = chatMessages.map((message) => {
      if (message.document) {
        return {
          ...message.toObject(),
          document: {
            url: message.document,
            originalName: message.documentOriginalName || "Document"
          }
        };
      }
      return message;
    });

    res.status(200).json(formattedMessages);
  } catch (error) {
    // console.error("Error in getChatMedia:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
