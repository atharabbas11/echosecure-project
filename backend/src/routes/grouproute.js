import express from "express";
import multer from "multer";
import {
  getAllUsers,
  getGroups,
  createGroup,
  sendGroupMessage,
  getGroupMessages,
  addMembersToGroup,
  removeMembersFromGroup,
  isUserAdmin,
  makeAdmin,
  removeAdmin,
  getNonGroupMembers,
  getGroupMembers,
  updateGroupProfilePic,
  updateGroupDetails,
  deleteGroup,
  getGroupMedia,
  editGroupMessage,
  markGroupMessageAsRead,
  pinGroupMessage,
  unpinGroupMessage,
  getPinnedGroupMessages,
  reactToGroupMessage,
  removeGroupMessageReaction,
  getGroupMessageReactionUsers,
} from "../controllers/groupController.js"; // Import the new group message controllers
import { protectRoute, validateCSRFToken } from "../middleware/auth.middleware.js"; // Import your authentication middleware

const storage = multer.memoryStorage(); // Store file in memory before uploading

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory as buffers
  limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB
});

const router = express.Router();

// Existing routes
router.get("/", protectRoute, getGroups);
router.get("/messages/group/:groupId", protectRoute, getGroupMessages);
router.get("/all-users", protectRoute, getAllUsers);
router.get("/:groupId/is-admin", protectRoute, isUserAdmin);
router.get("/:groupId/non-members", protectRoute, getNonGroupMembers);
router.get("/:groupId/members", protectRoute, getGroupMembers);
router.get("/:groupId/media", protectRoute, getGroupMedia);

// Group creation and message sending
router.post("/", protectRoute, validateCSRFToken, createGroup);
router.post(
  "/messages/group/send/:groupId",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "voice", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  protectRoute,
  validateCSRFToken,
  sendGroupMessage
);

// Group management routes
router.put("/:groupId/add-members", protectRoute, validateCSRFToken, addMembersToGroup);
router.put("/:groupId/remove-members", protectRoute, validateCSRFToken, removeMembersFromGroup);
router.put("/:groupId/make-admin", protectRoute, validateCSRFToken, makeAdmin);
router.put("/:groupId/remove-admin", protectRoute, validateCSRFToken, removeAdmin);
router.put("/:groupId/update-profile-pic", protectRoute, validateCSRFToken, updateGroupProfilePic);
router.put("/:groupId/update-group-info", protectRoute, validateCSRFToken, updateGroupDetails);
router.delete("/:groupId/delete", protectRoute, validateCSRFToken, deleteGroup);

// New group message-related routes
router.put("/messages/group/edit/:messageId", protectRoute, validateCSRFToken, editGroupMessage); // Edit group message
router.post("/messages/group/:messageId/read", protectRoute, validateCSRFToken, markGroupMessageAsRead); // Mark group message as read
router.post("/messages/group/:messageId/pin", protectRoute, validateCSRFToken, pinGroupMessage); // Pin group message
router.post("/messages/group/:messageId/unpin", protectRoute, validateCSRFToken, unpinGroupMessage); // Unpin group message
router.get("/messages/group/:groupId/pinned", protectRoute, getPinnedGroupMessages); // Get pinned group messages
router.post("/messages/group/:messageId/react", protectRoute, validateCSRFToken, reactToGroupMessage); // React to group message
router.post("/messages/group/:messageId/remove-reaction", protectRoute, validateCSRFToken, removeGroupMessageReaction); // Remove reaction from group message
router.get("/messages/group/:messageId/reactions", protectRoute, getGroupMessageReactionUsers); // Get users who reacted to a group message

export default router;