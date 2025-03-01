import React, { useRef, useState, useEffect } from "react";
import { Plus, Image, Send, X, Mic, Video, Reply, File, MapPin, User, Smile } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import OpenLayersMapComponent from "./OpenLayersMapComponent"; // The map component
import DocumentPreview from "./DocumentPreview";
import GifPicker from "./GifPicker"; // Import the GifPicker component

const GroupMessageInput = ({ isGroupChat = false }) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const { sendMessage, sendGroupMessage, repliedTo, setRepliedTo, messages, selectedUser, selectedGroup, getUsersForContact, users } = useChatStore();
  const { authUser: user } = useAuthStore();

  const [showOptions, setShowOptions] = useState(false);

  const [documentPreview, setDocumentPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [contact, setContact] = useState(null);
  const documentInputRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  const [showGifPicker, setShowGifPicker] = useState(false); // State for GIF picker
  const [gifUrl, setGifUrl] = useState(null); // State for selected GIF URL

  // Handle GIF selection
  const handleSelectGif = (url) => {
    setGifUrl(url);
  };

  // Close the options menu when any preview is shown
  useEffect(() => {
    if (imagePreview || videoPreview || documentPreview || audioBlob || location || contact || gifUrl) {
      setShowOptions(false);
    }
  }, [imagePreview, videoPreview, documentPreview, audioBlob, location, contact, gifUrl]);

  // Reset all state when selectedGroup changes
  useEffect(() => {
    setText("");
    setImagePreview(null);
    setVideoPreview(null);
    setDocumentPreview(null);
    setLocation(null);
    setAudioBlob(null);
    setRepliedTo(null);
    setIsRecording(false);
    setGifUrl(null);
    setIsSent(false);
    setIsLoading(false);
    // Reset file inputs
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (documentInputRef.current) documentInputRef.current.value = "";
  }, [selectedGroup]);

  // Voice Recording Logic
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mp3" });
        setAudioBlob(audioBlob);
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      // console.error("Error starting recording:", error);
      toast.error("Failed to start recording. Please allow microphone access.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle Document Upload
  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocumentPreview(file);
    }
  };

  const handleDocumentRemove = () => {
    setDocumentPreview(null);
    if (documentInputRef.current) {
      documentInputRef.current.value = ""; // Reset the file input to allow selecting the same file again
    }
  };

  // Handle Location Sharing
  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            type: "Point",
            coordinates: [position.coords.longitude, position.coords.latitude],
          });
        },
        (error) => {
          // console.error("Error getting location:", error);
          toast.error("Failed to get location. Please enable location access.");
        }
      );
    } else {
      toast.error("Geolocation is not supported by this browser.");
    }
  };

  // Fetch users when the contact modal is opened
  useEffect(() => {
    if (isContactModalOpen) {
      getUsersForContact();
    }
  }, [isContactModalOpen]);

  // Handle Contact Selection
  const handleSelectContact = (selectedContact) => {
    setContact({
      userId: selectedContact._id,
      fullName: selectedContact.fullName,
      profilePic: selectedContact.profilePic, // Include profilePic if needed
    });
    setSelectedContact(selectedContact); // Set the selected contact
    setIsContactModalOpen(false); // Close the modal
  };

  // Handle Contact Sharing
  const handleShareContact = () => {
    setIsContactModalOpen(true); // Open the contact modal
  };

  const handleRemoveContact = () => {
    setSelectedContact(null); // Clear the selected contact preview
    setContact(null); // Clear the contact state used for sharing
  };

  // Image Upload Logic
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Image Removal and Reset File Input
  const handleImageRemove = () => {
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = ""; // Reset the file input to allow selecting the same file again
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoPreview(URL.createObjectURL(file)); // Show preview before uploading
    }
  };

  const handleVideoRemove = () => {
    setVideoPreview(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = ""; // Reset the file input to allow selecting the same file again
    }
  };

  const handleReplyToMessage = (messageId) => {
    setRepliedTo(messageId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
  
    // Check if all fields are empty
    if (!text.trim() && !imagePreview && !audioBlob && !videoPreview && !documentPreview && !location && !contact && !gifUrl) {
      toast.error("Message cannot be empty");
      return;
    }
  
    setIsLoading(true);
    setIsSent(false);
  
    const formData = new FormData();
  
    // Append GIF URL if available
    if (gifUrl) {
      formData.append("gif", gifUrl);
    }

    // Append text if available
    if (text.trim()) {
      formData.append("text", text.trim());
    }
  
    // Append image if available
    if (imagePreview) {
      const fileInput = imageInputRef.current;
      if (fileInput && fileInput.files.length > 0) {
        formData.append("image", fileInput.files[0]);
      }
    }
  
    // Append voice if available
    if (audioBlob) {
      formData.append("voice", audioBlob, "voice.mp3");
    }
  
    // Append video if available
    if (videoPreview) {
      const fileInput = videoInputRef.current;
      if (fileInput && fileInput.files.length > 0) {
        formData.append("video", fileInput.files[0]);
      }
    }
  
    // Append document if available
    if (documentPreview) {
      const fileInput = documentInputRef.current;
      if (fileInput && fileInput.files.length > 0) {
        formData.append("document", fileInput.files[0]);
        formData.append("originalName", fileInput.files[0].name); // Append the original document name
      }
    }
  
    // Append location if available
    if (location) {
      formData.append("location", JSON.stringify(location));
    }
  
    // Append contact if available
    if (contact) {
      formData.append("contact", JSON.stringify(contact)); // Send contact as JSON
    }
  
    // Append repliedTo if available
    if (repliedTo) {
      formData.append("repliedTo", repliedTo);
    }
  
    try {
      // Send the form data to the backend
      await sendGroupMessage(formData);

      // Clear inputs and reset state
      setText("");
      setImagePreview(null);
      setVideoPreview(null);
      setDocumentPreview(null);
      setLocation(null);
      setAudioBlob(null);
      setContact(null);
      setSelectedContact(null); // Clear the selected contact preview
      setRepliedTo(null);
      setIsSent(true);
      setGifUrl(null);
    } catch (error) {
      // console.error("Failed to send message GMI:", error);
      if (error.response) {
        toast.error(error.response.data.error || "Failed to send message. Please try again.");
      } else {
        toast.error("Network error. Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 w-full bg-transparent">
      {/* Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 p-10">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-lg font-bold mb-4">Select a Contact</h2>
            <div className="max-h-60 overflow-y-auto">
              {users.map((user) => (
                <div key={user._id} className="flex gap-2 p-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleSelectContact(user)}>
                  <img src={user.profilePic || "/avatar.png"} className="h-7" alt={user.fullName} />
                  <p>{user.fullName}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setIsContactModalOpen(false)} className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Contact Preview */}
      {selectedContact && (
        <div className="mb-3 flex items-center gap-2 bg-transparent">
          <div className="relative flex items-center gap-2 p-2 bg-gray-100 rounded-lg border border-zinc-700">
            <img src={selectedContact.profilePic || "/avatar.png"} alt="Contact" className="w-10 h-10 object-cover rounded-full"/>
            <p className="text-sm font-semibold">{selectedContact.fullName}</p>
            <button onClick={handleRemoveContact} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center" type="button">
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* GIF Picker Modal */}
      {showGifPicker && (
        <GifPicker
          onSelectGif={handleSelectGif}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      {/* GIF Preview */}
      {gifUrl && (
        <div className="mb-3 relative">
          <img src={gifUrl} alt="Selected GIF" className="w-40 h-40 rounded-lg" />
          <button onClick={() => setGifUrl(null)} className="absolute top-0 right-0 -mt-2 -mr-2 w-6 h-6 rounded-full bg-base-300 flex items-center justify-center border border-gray-300" type="button">
            <X className="text-gray-700" size={16} />
          </button>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2 bg-transparent">
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-zinc-700"/>
            <button onClick={handleImageRemove} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center" type="button">
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* Video Preview */}
      {videoPreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <video controls className="w-40 h-40 rounded-lg">
              <source src={videoPreview} type="video/mp4"/>
            </video>
            <button onClick={handleVideoRemove} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center" type="button">
              <X className="text-gray-700" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Document Preview */}
      {documentPreview && (
        <div className="mb-3">
          <DocumentPreview file={documentPreview} onRemove={handleDocumentRemove} />
        </div>
      )}

      {/* Audio Preview */}
      {audioBlob && (
        <div className="mb-3">
          <audio controls src={URL.createObjectURL(audioBlob)} />
          <button
            onClick={() => setAudioBlob(null)}
            className="mt-2 text-red-500"
          >
            Remove Document
          </button>
        </div>
      )}

      {/* Location Preview */}
      {location && (
        <div className="mb-3">
          <OpenLayersMapComponent lat={location.coordinates[1]} lng={location.coordinates[0]} className="h-40"/>
          {/* {console.log(location.coordinates[1], location.coordinates[0])} */}
          <button onClick={() => setLocation(null)} className="mt-2 text-red-500">
            Remove Location
          </button>
        </div>
      )}

      {/* Replied To Message */}
      {repliedTo && (
        <div className="mb-3 p-2 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">Replying to:</p>
          <p className="text-sm">{messages.find(msg => msg._id === repliedTo)?.text}</p>
          <button onClick={() => setRepliedTo(null)} className="text-red-500 text-sm">
            Cancel Reply
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <textarea className="w-full p-3 text-sm placeholder:text-gray-400 input input-bordered rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a message..." value={text} onChange={(e) => setText(e.target.value)}
            style={{ backgroundColor: "transparent", scrollbarWidth: "thin", scrollbarColor: "#5A67D8 transparent" }}
          />

          {/* Hidden file inputs */}
          <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageUpload} />
          <input type="file" accept="video/*" className="hidden" ref={videoInputRef} onChange={handleVideoUpload} />
          <input type="file" accept=".pdf,.doc,.docx" className="hidden" ref={documentInputRef} onChange={handleDocumentUpload} />

          <div className="relative flex flex-col items-center z-20">
            {/* Floating options box (Vertical) */}
            {showOptions && (
              <div className="absolute bottom-12 flex flex-col items-center gap-2 bg-white shadow-lg rounded-lg p-2">
                {/* Image Upload */}
                <button type="button" className="btn btn-circle text-zinc-400" onClick={() => imageInputRef.current?.click()}>
                  <Image size={20} />
                </button>

                {/* Video Upload */}
                <button type="button" className="btn btn-circle text-zinc-400" onClick={() => videoInputRef.current?.click()}>
                  <Video size={20} />
                </button>

                {/* Document Upload */}
                <button type="button" className="btn btn-circle text-zinc-400" onClick={() => documentInputRef.current?.click()}>
                  <File size={20} />
                </button>

                {/* Location Sharing */}
                <button type="button" className="btn btn-circle text-zinc-400" onClick={(e) => {handleShareLocation(e); setShowOptions(false);}} >
                  <MapPin size={20} />
                </button>
          
                {/* Contact Sharing */}
                <button type="button" className="btn btn-circle text-zinc-400" onClick={(e) => {handleShareContact(e); setShowOptions(false);}} >
                  <User size={20} />
                </button>

                <button type="button" className={`btn btn-circle ${isRecording ? "text-red-500" : "text-zinc-400"}`} onClick={() => { if(isRecording) { handleStopRecording(); setShowOptions(false); } else  {handleStartRecording();} }}>
                  <Mic size={20} />
                </button>
            
                <button type="button" className="btn btn-circle text-zinc-400" onClick={(e) => {setShowGifPicker(e); setShowOptions(false);}}>
                  <Smile size={22} />
                </button>
            </div>
            )}
            {/* + Button (Toggles Menu) */}
            <button type="button" className="btn btn-circle text-zinc-400" onClick={() => setShowOptions(!showOptions)}>
              {showOptions ? <X size={22} /> : <Plus size={22} />}
            </button>
          </div>
          {/* Wrapper to Keep Send Button at Bottom */}
          <div className="items-center flex">
            <button type="submit" className="btn btn-sm btn-circle" disabled={!text.trim() && !imagePreview && !audioBlob && !videoPreview && !documentPreview && !location && !contact && !gifUrl}>
              <Send size={22} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default GroupMessageInput;