import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { X, AudioLines } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import OpenLayersMapComponent from "./OpenLayersMapComponent";
import DocumentPreview from "./DocumentPreview";

const GroupMediaSection = ({ onClose }) => {
  const { selectedGroup } = useChatStore();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // State for active filter

  useEffect(() => {
    fetchGroupMedia();
  }, [page, activeFilter]);

  const fetchGroupMedia = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/groups/${selectedGroup._id}/media?page=${page}&limit=9&filter=${activeFilter}`);
      const newMedia = res.data;
      setHasMore(newMedia.length > 0);
      setMedia((prev) => {
        const newItems = newMedia.filter(
          (newItem) => !prev.some((item) => item._id === newItem._id)
        );
        return [...prev, ...newItems];
      });
    } catch (error) {
      // console.error("Error fetching group media:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeeMore = () => {
    setPage((prevPage) => prevPage + 1);
  };

  // Filter media based on active filter
  const filteredMedia = media.filter((message) => {
    if (activeFilter === "all") return true;
    return message[activeFilter] !== null && message[activeFilter] !== undefined;
  });

  // Function to group media by date
  const groupMediaByDate = (mediaList) => {
    const grouped = {};
    mediaList.forEach((message) => {
      const date = new Date(message.createdAt).toLocaleDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(message);
    });
    return grouped;
  };

  const groupedMedia = groupMediaByDate(filteredMedia);

  return (
    <div className="bg-base-100 p-4 w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Group Media</h3>
          <button onClick={onClose}><X /></button>
        </div>

        {/* Media Filter Bar */}
        <div className="bg-base-100 p-4 w-full overflow-y-auto max-h-[calc(100vh-180px)]" style={{ backgroundColor: "transparent", scrollbarWidth: "thin", scrollbarColor: "#5A67D8 transparent" }}>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2" style={{ backgroundColor: "transparent", scrollbarWidth: "thin", scrollbarColor: "#5A67D8 transparent" }}>
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

          {Object.keys(groupedMedia).length > 0 ? (
              Object.keys(groupedMedia).map((dateString) => (
                <div key={dateString}>
                  <h4 className="font-semibold">{dateString}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {groupedMedia[dateString].map((message) => (
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
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p>No media available.</p>
          )}

          {loading && <p>Loading...</p>}

          {hasMore && !loading && (
            <div className="text-center mt-2">
              <button onClick={handleSeeMore} className="text-blue-500">
                See more
              </button>
            </div>
          )}
        </div>
    </div>
  );
};

export default GroupMediaSection;
