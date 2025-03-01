import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const GifPicker = ({ onSelectGif, onClose }) => {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [nextPos, setNextPos] = useState(""); // Store next position for pagination
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef(null);

  const TENOR_API_KEY = import.meta.env.VITE_TENOR_API_KEY;
  const CLIENT_ID = import.meta.env.VITE_TENOR_CLIENT_ID;

  const fetchGifs = async (reset = false) => {
    if (loading || gifs.length >= 20) return; // Stop fetching if 20 GIFs are loaded
    setLoading(true);

    try {
      const response = await axios.get("https://tenor.googleapis.com/v2/search", {
        params: {
          q: query || "trending",
          key: TENOR_API_KEY,
          client_key: CLIENT_ID,
          limit: Math.min(10, 20 - gifs.length), // Load only up to 20
          pos: reset ? "" : nextPos, // Use the correct pagination string
        },
      });

      setGifs((prevGifs) => (reset ? response.data.results : [...prevGifs, ...response.data.results]));
      setNextPos(response.data.next); // Save the next position from response
    } catch (error) {
      // console.error("Error fetching GIFs:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPos && gifs.length < 20) {
          fetchGifs();
        }
      },
      { threshold: 1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [nextPos, gifs.length]); // Depend on nextPos and gifs.length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <h2 className="text-lg font-bold mb-4 text-gray-800 text-center">Search GIFs</h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search for GIFs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
          <button
            onClick={() => {
              setGifs([]);
              setNextPos(""); // Reset pagination
              fetchGifs(true); // Pass true to reset
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Search
          </button>
        </div>

        {/* GIF Grid */}
        <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => {
              const mediaUrl =
                gif.media_formats?.gif?.url ||
                gif.media_formats?.tinygif?.url ||
                gif.media_formats?.nanogifpreview?.url;
              if (!mediaUrl) return null;

              return (
                <img
                  key={gif.id}
                  src={mediaUrl}
                  alt={gif.title || "GIF"}
                  className="w-full h-28 object-cover rounded-lg cursor-pointer hover:scale-105 transition"
                  onClick={() => {
                    onSelectGif(mediaUrl);
                    onClose();
                  }}
                />
              );
            })}
          </div>
          <div ref={loaderRef} className="text-center text-gray-500 mt-4">
            {loading && "Loading more..."}
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default GifPicker;
