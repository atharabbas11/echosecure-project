//message.model.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: function () {
      return !this.groupId; // Only required if there is no groupId
    } },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // Add this for groupId
    text: { type: String, },
    gif: { type: String }, // Add this field for GIFs
    image: { type: String, },
    voice: { type: String }, // Add this field for voice messages
    video: { type: String },
    document: { type: String }, // Add this field for documents
    originalName: { type: String },
    location: { // Add this field for location
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      }
    },

    contact: {
      type: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        fullName: { type: String },
        profilePic: { type: String },
      },
    },
    expiresAt: { type: Date, },
    repliedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" }, // Add this field
    pinned: { type: Boolean, default: false }, // Add this field for pinned messages
    isEdited: { type: Boolean, default: false }, // Add this field
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Add this for read receipts

    reactions: {
      type: Map,
      of: [mongoose.Schema.Types.ObjectId], // Store user IDs who reacted with a specific emoji
      default: new Map(),
    },
  },
  { timestamps: true }
);

// Add a TTL index on the `expiresAt` field
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Message = mongoose.model("Message", messageSchema);
export default Message;