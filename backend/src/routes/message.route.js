import express from "express";
import multer from "multer";
import { protectRoute, validateCSRFToken } from "../middleware/auth.middleware.js"; // Import validateCSRFToken
import {
  sendMessage,
  getMessages,
  getUsersForSidebar,
  getUsersNotMessaged,
  deleteChat,
  getChatMedia,
  reactToMessage,
  removeReaction,
  getreactToMessage,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  editMessage,
  markMessageAsRead,
} from "../controllers/message.controller.js";

const storage = multer.memoryStorage(); // Store file in memory before uploading

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory as buffers
  limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB
});

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/notmessagedusers", protectRoute, getUsersNotMessaged);
router.get("/:id", protectRoute, getMessages);
router.get("/:userToChatId/media", protectRoute, getChatMedia);
router.get("/:messageId/reactions", protectRoute, getreactToMessage);
router.get("/:id/pinned", protectRoute, getPinnedMessages);

router.post(
  "/send/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "voice", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  protectRoute,
  validateCSRFToken, // Add CSRF validation
  sendMessage
);

router.delete("/delete/:id", protectRoute, validateCSRFToken, deleteChat); // Add CSRF validation
router.put("/edit/:messageId", protectRoute, validateCSRFToken, editMessage); // Add CSRF validation
router.post("/:messageId/react", protectRoute, validateCSRFToken, reactToMessage); // Add CSRF validation
router.post("/:messageId/remove-reaction", protectRoute, validateCSRFToken, removeReaction);
router.post("/:messageId/pin", protectRoute, validateCSRFToken, pinMessage); // Add CSRF validation
router.post("/:messageId/unpin", protectRoute, validateCSRFToken, unpinMessage); // Add CSRF validation
router.post("/:messageId/read", protectRoute, validateCSRFToken, markMessageAsRead); // Add CSRF validation
export default router;