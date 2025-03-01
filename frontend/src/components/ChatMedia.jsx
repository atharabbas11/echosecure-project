import { useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";
import { AudioLines } from "lucide-react";
import OpenLayersMapComponent from "./OpenLayersMapComponent";
import DocumentPreview from "./DocumentPreview";

const ChatMedia = ({ userToChatId, onSeeMoreClick }) => {
  const { selectedUser } = useChatStore();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // State for active filter

  useEffect(() => {
    if (userToChatId) {
      fetchChatMedia();
    }
  }, [page, userToChatId, activeFilter]); // Fetch media when filter changes

  const fetchChatMedia = async () => {
    if (!userToChatId) {
      // console.error("userToChatId is undefined");
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.get(`/messages/${userToChatId}/media?page=${page}&limit=3&filter=${activeFilter}`);
      const newMedia = res.data;
      setHasMore(newMedia.length > 0);
      setMedia((prev) => {
        const newMedia = res.data.filter(
          (newItem) => !prev.some((item) => item._id === newItem._id)
        );
        return [...prev, ...newMedia];
      });
    } catch (error) {
      // console.error("Error fetching chat media:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter media based on active filter
  const filteredMedia = media.filter((message) => {
    if (activeFilter === "all") return true;
    return message[activeFilter] !== null && message[activeFilter] !== undefined;
  });

  return (
    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
      <h3 className="text-lg font-semibold">Chat Media</h3>

      {/* Media Filter Bar */}
      <div className="flex gap-2 my-2 overflow-x-auto pb-2" style={{ backgroundColor: "transparent", scrollbarWidth: "thin", scrollbarColor: "#5A67D8 transparent" }}>
        <button onClick={() => setActiveFilter("all")} className={`px-3 py-1 rounded-full text-sm ${activeFilter === "all" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>
          All
        </button>
        <button onClick={() => setActiveFilter("image")} className={`px-3 py-1 rounded-full text-sm ${activeFilter === "image" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>
          Photos
        </button>
        <button onClick={() => setActiveFilter("gif")} className={`px-3 py-1 rounded-full text-sm ${activeFilter === "gif" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>
          GIF
        </button>
        <button onClick={() => setActiveFilter("video")} className={`px-3 py-1 rounded-full text-sm ${activeFilter === "video" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>
          Videos
        </button>
        <button onClick={() => setActiveFilter("voice")} className={`px-3 py-1 rounded-full text-sm ${activeFilter === "voice" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>
          Audio
        </button>
        <button onClick={() => setActiveFilter("document")} className={`px-3 py-1 rounded-full text-sm ${activeFilter === "document" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>
          Documents
        </button>
        <button onClick={() => setActiveFilter("location")} className={`px-3 py-1 rounded-full text-sm ${activeFilter === "location" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>
          Locations
        </button>
        <button onClick={() => setActiveFilter("link")} className={`px-3 py-1 rounded-full text-sm ${activeFilter === "link" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>
          Links
        </button>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-3 gap-2">
        {filteredMedia.length > 0 ? (
          filteredMedia.slice(0, 3).map((message) => (
            <div key={`${message._id}-${message.timestamp}`} className="relative">
              {message.image && (
                <img src={message.image} alt="Message Media" className="w-full h-32 object-cover rounded-lg"/>
              )}

              {message.gif && (  
                <img src={message.gif} alt="Message Media" className="w-full h-32 object-cover rounded-lg"/>
              )}
              
              {message.video && (
                <video src={message.video} className="w-full h-32 object-cover rounded-lg" controls/>
              )}

              {message.voice && (
                <div className="bg-base-200 h-32 flex flex-col items-center justify-between rounded-lg">
                  <div className="text-blue-500 flex mt-6 justify-center">
                    <AudioLines className="w-10 h-10" />
                  </div>
                  <audio src={message.voice} controls className="w-full rounded-lg" />
                </div>
              )}

              {message.document && (
                <>
                  <a href={message.document.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                    <DocumentPreview file={{ name: message.originalName }} showRemove={false} className="w-full h-32 object-cover rounded-lg"/>
                  </a>
                </>
              )}  

              {message.location && (
                <>
                  <a href={`https://www.openstreetmap.org/?mlat=${message.location.coordinates[1]}&mlon=${message.location.coordinates[0]}#map=15/${message.location.coordinates[1]}/${message.location.coordinates[0]}`} target="_blank" rel="noopener noreferrer">
                    <OpenLayersMapComponent lat={message.location.coordinates[1]} lng={message.location.coordinates[0]} className="h-32 text-black text-xs"/>
                  </a>
                </>
              )}
              
              {message.link && (
                <a href={message.link} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                  Link
                </a>
              )}
              
              <p className="text-xs text-center">{message.senderId?.fullName}</p>
            </div>
          ))
        ) : (
          <p>No media available.</p>
        )}
      </div>
      {loading && <p>Loading...</p>}
    </div>
  );
};

export default ChatMedia;