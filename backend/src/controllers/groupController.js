import Group from "../models/groupModel.js";
import User from "../models/user.model.js";
import crypto from "crypto";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";
import { getReceiverSocketId } from "../lib/socket.js"; // adjust the path if needed
import mongoose from "mongoose";

const ENCRYPTION_KEY = crypto.createHash("sha256").update("your_secret_encryption_key").digest();
const IV_LENGTH = 16;

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

const decrypt = (encryptedText) => {
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

export const getAllUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Find all users except the logged-in user and return fullName, profilePic, and _id
    const users = await User.find({ _id: { $ne: loggedInUserId } })
      .select("fullName profilePic _id"); // Include profilePic along with fullName and _id

    res.status(200).json(users); // Return the users without messages
  } catch (error) {
    // console.error("Error in getAllUsers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch groups that the user is a part of
    const groups = await Group.find({ members: userId }).populate("members", "fullName profilePic");

    // Fetch the latest message for each group
    const formattedGroups = await Promise.all(
      groups.map(async (group) => {
        const latestMessage = await Message.findOne({ groupId: group._id })
          .sort({ createdAt: -1 }) // Get the most recent message
          .limit(1)
          .lean(); // Convert to a plain object

        return {
          ...group.toObject(),
          latestMessage: latestMessage || null, // Attach the latest message
        };
      })
    );

    // Sort groups by the latest message timestamp in descending order
    formattedGroups.sort((a, b) => {
      const aTimestamp = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0); // Use 0 if no message
      const bTimestamp = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0); // Use 0 if no message
      return bTimestamp - aTimestamp; // Sort in descending order
    });

    res.status(200).json(formattedGroups);
  } catch (error) {
    // console.error("Error in getGroups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createGroup = async (req, res) => {
  try {
      const { name, description, members } = req.body;

      // Validate the request body
      if (!name || !description || !members || !Array.isArray(members)) {
          return res.status(400).json({ error: "Invalid request body. 'name' and 'members' (array) are required." });
      }

      const adminId = req.user._id;

      // Ensure members is an array and includes the admin
      const groupMembers = [...new Set([...members, adminId])]; // Remove duplicates

      const group = new Group({
          name,
          admin: adminId,
          description,
          members: groupMembers,
      });

      await group.save();

      // Add group to each member's groups list
      await User.updateMany(
          { _id: { $in: groupMembers } },
          { $push: { groups: group._id } }
      );

      // Serialize the group data
      const serializedGroup = {
          ...group.toObject(),
          _id: group._id.toString(),
          admin: group.admin.toString(),
          members: group.members.map(member => member.toString()),
          createdAt: group.createdAt.toISOString(),
          updatedAt: group.updatedAt.toISOString(),
      };

      // console.log("Emitting newGroupCreated event to members:", groupMembers);

      // Notify all group members about the new group
      groupMembers.forEach((memberId) => {
          const memberSocketId = getReceiverSocketId(memberId);
          if (memberSocketId) {
              io.to(memberSocketId).emit("newGroupCreated", serializedGroup);
          }
      });

      res.status(201).json(serializedGroup);
  } catch (error) {
      // console.error("Error in createGroup:", error);
      res.status(500).json({ error: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    // console.log("Request Body:", req.body);
    // console.log("Request Files:", req.files);

    const { text, location, repliedTo, originalName, gif } = req.body;
    const contact = req.body.contact ? JSON.parse(req.body.contact) : null; // Convert JSON string to object

    const { groupId } = req.params;
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
            if (error) reject(error);
            else resolve(result);
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
    if (contact) {
      try {
        // Extract userId from the contact object
        const { userId } = contact;

        const contactUser = await User.findById(userId);
        if (contactUser) {
          contactData = {
            userId: contactUser._id,
            fullName: contactUser.fullName,
            profilePic: contactUser.profilePic, // Include profilePic if needed
          };
        } else {
          return res.status(400).json({ error: "Contact not found" });
        }
      } catch (error) {
        return res.status(400).json({ error: "Invalid contact data" });
      }
    }

    if (contact && contact.userId) {
      try {
        const contactUser = await User.findById(contact.userId); // Use contact.userId, not contact directly
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
    const disappearSetting = sender?.disappearSettings?.get(groupId) || "off";
    if (disappearSetting !== "off") {
      const expiryMinutes = parseInt(disappearSetting.replace("min", ""));
      if (!isNaN(expiryMinutes)) {
        expiresAt = new Date(Date.now() + expiryMinutes * 60000);
      }
    }

    const encryptedText = text ? encrypt(text) : null;

    const newMessage = new Message({
      senderId,
      groupId,
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
      gif,
    });

    await newMessage.save();

    const serializedMessage = {
      ...newMessage.toObject(),
      _id: newMessage._id.toString(),
      senderId: newMessage.senderId.toString(),
      groupId: newMessage.groupId.toString(),
      createdAt: newMessage.createdAt.toISOString(),
      updatedAt: newMessage.updatedAt.toISOString(),
      expiresAt: newMessage.expiresAt ? newMessage.expiresAt.toISOString() : null,
      repliedTo: newMessage.repliedTo ? newMessage.repliedTo.toString() : null,
      reactions: newMessage.reactions ? Object.fromEntries(newMessage.reactions) : {},
      gif: newMessage.gif, // Include GIF URL in the response
    };

    const decryptedText = serializedMessage.text ? decrypt(serializedMessage.text) : null;
    serializedMessage.text = decryptedText;

    // Fetch the sender's details
    const senderDetails = await User.findById(senderId).select('fullName profilePic');
    serializedMessage.senderName = senderDetails.fullName;
    serializedMessage.senderProfilePic = senderDetails.profilePic;

    // Notify all group members about the new message
    const group = await Group.findById(groupId);
    group.members.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("newGroupMessage", serializedMessage);
      }
    });

    res.status(201).json(serializedMessage);
    // console.log("Response sent:", serializedMessage); // Add this for debugging
  } catch (error) {
    // console.error("Error in sendGroupMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const messages = await Message.find({ groupId });
    const group = await Group.findById(groupId).populate('members', 'fullName'); // Populate member details (name) of the group

    const decryptedMessages = messages.map((msg) => {
      const sender = group.members.find(member => member._id.toString() === msg.senderId.toString());
      return {
        ...msg.toObject(),
        text: decrypt(msg.text),
        senderName: sender ? sender.fullName : 'Unknown', // Add sender name
        reactions: msg.reactions instanceof Map ? Object.fromEntries(msg.reactions) : msg.reactions,
      };
    });

    res.status(200).json(decryptedMessages);
  } catch (error) {
    // console.error("Error in getGroupMessages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const isUserAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isAdmin = group.admin.some(adminId => adminId.toString() === userId.toString());
    res.status(200).json({ isAdmin });
  } catch (error) {
    // console.error("Error in isUserAdmin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const makeAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { newAdminId } = req.body;
    const userId = req.user._id;
    
    
    if (!newAdminId) {
      return res.status(400).json({ error: "New admin ID is required" });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if the user is the admin of the group
    if (group.admin.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only the admin can assign a new admin" });
    }

    // Check if the new admin is a member of the group
    if (!group.members.includes(newAdminId)) {
      return res.status(400).json({ error: "New admin must be a member of the group" });
    }

    
    // Prevent removing the last admin
    if (group.admin.length === 0) {
      return res.status(400).json({ error: "At least one admin must remain" });
    }

    // Assign new admin
    // group.admin = newAdminId;
    // await group.save();

    // res.status(200).json(group);
    
    // Add the new admin to the admin list if not already there
    if (!group.admin.includes(newAdminId)) {
      group.admin.push(newAdminId);
      await group.save();
      return res.status(200).json(group);
    } else {
      return res.status(400).json({ error: "User is already an admin" });
    }
  } catch (error) {
    // console.error("Error in makeAdmin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { adminId } = req.body;
    const userId = req.user._id;

    if (!adminId) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Ensure the request is made by an existing admin
    if (!group.admin.includes(userId.toString())) {
      return res.status(403).json({ error: "Only an admin can remove another admin" });
    }

    // Ensure the admin to be removed exists in the admin list
    if (!group.admin.includes(adminId)) {
      return res.status(400).json({ error: "User is not an admin" });
    }

    // Prevent removing the last admin
    if (group.admin.length === 1) {
      return res.status(400).json({ error: "At least one admin must remain" });
    }

    // Remove the admin
    group.admin = group.admin.filter(id => id.toString() !== adminId);
    await group.save();

    res.status(200).json(group);
  } catch (error) {
    // console.error("Error in removeAdmin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getNonGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const nonMembers = await User.find({ _id: { $nin: group.members } });
    res.status(200).json(nonMembers);
  } catch (error) {
    // console.error("Error in getNonGroupMembers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate("members", "fullName profilePic _id").populate("admin", "fullName profilePic _id");
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    res.status(200).json(group.members); // Return the populated members array
  } catch (error) {
    // console.error("Error in getGroupMembers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateGroupProfilePic = async (req, res) => {
  try {
    // console.log("Request Params:", req.params);
    // console.log("Request Body:", req.body);
    // console.log("Request User:", req.user);

    const { groupId } = req.params;
    const { profilePic } = req.body;
    const userId = req.user?._id;

    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User not authenticated" });
    }

    if (!profilePic) {
      return res.status(400).json({ error: "Profile picture is required" });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if the user is an admin of the group
    if (!group.admin.includes(userId)) {
      return res.status(403).json({ error: "Only the admin can update the group profile picture" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const profilePicUrl = uploadResponse.secure_url;

    group.profilePic = profilePicUrl;
    await group.save();

    res.status(200).json(group);
  } catch (error) {
    // console.error("Error in updateGroupProfilePic:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if the user is an admin of the group
    if (!group.admin.includes(userId)) {
      return res.status(403).json({ error: "Only the admin can update group details" });
    }

    // Update group details
    if (name) group.name = name;
    if (description) group.description = description;

    // Save the group
    await group.save();

    res.status(200).json(group);
  } catch (error) {
    // console.error("Error in updateGroupDetails:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addMembersToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if the user is an admin of the group
    if (!group.admin.includes(userId)) {
      return res.status(403).json({ error: "Only the admin can add members" });
    }

    // Add new members to the group
    const newMembers = [...new Set([...group.members, ...members])];
    group.members = newMembers;

    // Save the group
    await group.save();

    // Add group to each new member's groups list
    await User.updateMany(
      { _id: { $in: members } },
      { $push: { groups: group._id } }
    );

    // Serialize the group data
    const serializedGroup = {
      ...group.toObject(),
      _id: group._id.toString(),
      admin: group.admin.map(admin => admin.toString()),
      members: group.members.map(member => member.toString()),
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    };

    // Notify all group members about the updated group
    group.members.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("membersAddedToGroup", serializedGroup);
      }
    });

    // Notify the added users that they have been added to the group
    members.forEach((addedUserId) => {
      const addedUserSocketId = getReceiverSocketId(addedUserId);
      if (addedUserSocketId) {
        io.to(addedUserSocketId).emit("userAddedToGroup", serializedGroup);
      }
    });

    res.status(200).json(serializedGroup);
  } catch (error) {
    // console.error("Error in addMembersToGroup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeMembersFromGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if the user is an admin of the group
    if (!group.admin.includes(userId)) {
      return res.status(403).json({ error: "Only the admin can remove members" });
    }

    // Prevent removal of the last admin
    const remainingAdmins = group.admin.filter(admin => !members.includes(admin.toString()));
    if (remainingAdmins.length === 0 && members.some(member => group.admin.includes(member))) {
      return res.status(400).json({ error: "You cannot remove the last admin from the group" });
    }

    // Remove members from the group
    group.members = group.members.filter(member => !members.includes(member.toString()));
    group.admin = group.admin.filter(admin => !members.includes(admin.toString()));
    await group.save();

    // Remove group from each removed member's groups list
    await User.updateMany(
      { _id: { $in: members } },
      { $pull: { groups: group._id } }
    );

    // Serialize the group data
    const serializedGroup = {
      ...group.toObject(),
      _id: group._id.toString(),
      admin: group.admin.map(admin => admin.toString()),
      members: group.members.map(member => member.toString()),
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    };

    // Notify all group members about the updated group
    group.members.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("membersRemovedFromGroup", serializedGroup);
      }
    });

    // Notify the removed users that they have been removed from the group
    members.forEach((removedUserId) => {
      const removedUserSocketId = getReceiverSocketId(removedUserId);
      if (removedUserSocketId) {
        io.to(removedUserSocketId).emit("userRemovedFromGroup", { groupId: group._id.toString() });
      }
    });

    res.status(200).json(serializedGroup);
  } catch (error) {
    // console.error("Error in removeMembersFromGroup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Ensure the request is made by an admin
    if (!group.admin.includes(userId.toString())) {
      return res.status(403).json({ error: "Only an admin can delete the group" });
    }

    // Remove the groupId from all users' 'groups' arrays who are members of this group
    await User.updateMany(
      { _id: { $in: group.members } },
      { $pull: { groups: groupId } }
    );

    // Delete the group
    await Group.findByIdAndDelete(groupId);

    // Notify all group members about the deleted group
    group.members.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupDeleted", { groupId: group._id.toString() });
      }
    });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    // console.error("Error in deleteGroup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMedia = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 10, filter = "all" } = req.query; // Default page 1, limit 10

    if (!groupId) {
      return res.status(400).json({ error: "groupId is required" });
    }

    const skip = (page - 1) * limit;

    // Build query to fetch only media messages
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
      groupId,
      $or: mediaConditions // Ensures media messages only
    };

    const groupMessages = await Message.find(mediaQuery)
      .skip(skip)
      .limit(Number(limit))
      .populate("senderId", "fullName profilePic _id")
      .sort({ createdAt: -1 });

    // Format document messages to include originalName
    const formattedMessages = groupMessages.map((message) => {
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

    res.status(200).json(formattedMessages); // Return media messages
  } catch (error) {
    // console.error("Error in getGroupMedia:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editGroupMessage = async (req, res) => {
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
      groupId: updatedMessage.groupId.toString(),
      createdAt: updatedMessage.createdAt.toISOString(),
      updatedAt: updatedMessage.updatedAt.toISOString(),
      expiresAt: updatedMessage.expiresAt ? updatedMessage.expiresAt.toISOString() : null,
      repliedTo: updatedMessage.repliedTo ? updatedMessage.repliedTo.toString() : null,
      reactions: updatedMessage.reactions ? Object.fromEntries(updatedMessage.reactions) : {},
      isEdited: updatedMessage.isEdited,
    };

    const decryptedText = serializedMessage.text ? decrypt(serializedMessage.text) : null;
    serializedMessage.text = decryptedText;

    // Notify all group members about the updated message
    const group = await Group.findById(updatedMessage.groupId);
    group.members.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupMessageUpdated", serializedMessage);
      }
    });

    res.status(200).json(serializedMessage);
  } catch (error) {
    // console.error("Error in editGroupMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markGroupMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (!message.readBy.includes(userId)) {
      message.readBy.push(userId);
      await message.save();

      // Notify the sender that the message has been read
      const senderSocketId = getReceiverSocketId(message.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("groupMessageRead", { messageId, readBy: message.readBy });
      }
    }

    res.status(200).json({ message: "Message marked as read" });
  } catch (error) {
    // console.error("Error in markGroupMessageAsRead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const pinGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const pinnedMessagesCount = await Message.countDocuments({
      groupId: message.groupId,
      pinned: true,
    });

    if (pinnedMessagesCount >= 3) {
      return res.status(400).json({ error: "Maximum of 3 pinned messages allowed" });
    }

    message.pinned = true;
    await message.save();

    const updatedMessage = {
      ...message.toObject(),
      text: message.text ? decrypt(message.text) : null,
    };

    // Notify all group members about the new pinned message
    const group = await Group.findById(message.groupId);
    group.members.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupMessagePinned", updatedMessage);
      }
    });

    res.status(200).json(updatedMessage);
  } catch (error) {
    // console.error("Error in pinGroupMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const unpinGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    message.pinned = false;
    await message.save();

    const updatedMessage = {
      ...message.toObject(),
      text: message.text ? decrypt(message.text) : null,
    };

    // Check if the group exists before accessing its members
    const group = await Group.findById(message.groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    
    // Notify all group members about the unpinned message
    group.members.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupMessageUnpinned", updatedMessage);
      }
    });

    res.status(200).json(updatedMessage);
  } catch (error) {
    // console.error("Error in unpinGroupMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPinnedGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const pinnedMessages = await Message.find({
      groupId,
      pinned: true,
    });

    const decryptedMessages = pinnedMessages.map((msg) => ({
      ...msg.toObject(),
      text: decrypt(msg.text),
      reactions: msg.reactions instanceof Map ? Object.fromEntries(msg.reactions) : msg.reactions,
    }));

    res.status(200).json(decryptedMessages);
  } catch (error) {
    // console.error("Error in getPinnedGroupMessages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const reactToGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (!message.reactions) {
      message.reactions = new Map();
    }

    for (const [existingEmoji, userIds] of message.reactions.entries()) {
      if (userIds.includes(userId)) {
        const updatedReactions = userIds.filter((id) => id.toString() !== userId.toString());

        if (updatedReactions.length === 0) {
          message.reactions.delete(existingEmoji);
        } else {
          message.reactions.set(existingEmoji, updatedReactions);
        }
      }
    }

    const userReactions = message.reactions.get(emoji) || [];
    message.reactions.set(emoji, [...userReactions, userId]);

    await message.save();

    const updatedMessage = {
      ...message.toObject(),
      reactions: message.reactions ? Object.fromEntries(message.reactions) : {},
    };

    // Notify all group members about the new message reaction
    const group = await Group.findById(message.groupId);
    group.members.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupMessageReaction", updatedMessage);
      }
    });

    res.status(200).json({ message: "Reaction updated", removed: false });
  } catch (error) {
    // console.error("Error in reactToGroupMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeGroupMessageReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji, userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid messageId or userId" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (!message.reactions || !message.reactions.has(emoji)) {
      return res.status(404).json({ error: "Reaction not found" });
    }

    const userReactions = message.reactions.get(emoji);

    if (!userReactions.includes(userId)) {
      return res.status(403).json({ error: "You are not authorized to remove this reaction" });
    }

    const updatedReactions = userReactions.filter((id) => id.toString() !== userId.toString());

    if (updatedReactions.length === 0) {
      message.reactions.delete(emoji);
    } else {
      message.reactions.set(emoji, updatedReactions);
    }

    await message.save();

    const updatedMessage = {
      ...message.toObject(),
      reactions: message.reactions ? Object.fromEntries(message.reactions) : {},
    };

    // Notify all group members about the updated message
    const group = await Group.findById(message.groupId);
    group.members.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupMessageReaction", updatedMessage);
      }
    });

    // res.status(200).json({ message: "Reaction removed", removed: true });
    res.status(200).json({ message: "Reaction removed", removed: true, updatedMessage });
  } catch (error) {
    // console.error("Error in removeGroupMessageReaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessageReactionUsers = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!messageId) {
      return res.status(400).json({ error: "Message ID is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (!message.reactions || message.reactions.size === 0) {
      return res.status(200).json({});
    }

    const reactionUserIds = [...new Set(Array.from(message.reactions.values()).flat())];

    const users = await User.find(
      { _id: { $in: reactionUserIds } },
      { _id: 1, fullName: 1, profilePic: 1 }
    );

    const reactionsWithUsers = {};
    for (const [emoji, userIds] of message.reactions.entries()) {
      reactionsWithUsers[emoji] = users
        .filter((user) => userIds.includes(user._id.toString()))
        .map((user) => ({
          _id: user._id,
          fullName: user.fullName,
          profilePic: user.profilePic,
        }));
    }

    return res.status(200).json(reactionsWithUsers);
  } catch (error) {
    // console.error("Error fetching group message reaction users:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};