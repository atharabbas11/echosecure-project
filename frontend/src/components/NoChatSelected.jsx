//src/components/NoChatSelected.jsx
import React, {useEffect} from 'react';
import eslogo from '../images/eslogo.png';
import { useChatStore } from "../store/useChatStore";

const NoChatSelected = () => {
  const { subscribeToMessages, subscribeToGroupMessages, unsubscribeFromMessages, unsubscribeFromGroupMessages } = useChatStore();

  // Subscribe to messages when the component mounts
  useEffect(() => {
    // console.log("Subscribed to messages in HomePage Group");
    subscribeToGroupMessages(); // Subscribe to messages
    return () => {
      unsubscribeFromGroupMessages(); // Unsubscribe when the component unmounts
    };
  }, [subscribeToGroupMessages, unsubscribeFromGroupMessages]);

  useEffect(() => {
    // console.log("Subscribed to messages in NoChatContainer");
    subscribeToMessages(); // Subscribe to messages when the component mounts
    return () => {
      unsubscribeFromMessages(); // Unsubscribe when the component unmounts
    };
  }, [subscribeToMessages, unsubscribeFromMessages]);

  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center p-8 lg:p-16 bg-base-100/50">
      <div className="max-w-md text-center space-y-4 lg:space-y-6">
        <div className="flex justify-center gap-4 mb-4">
          <div className="relative">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-bounce overflow-hidden">
              <img src={eslogo} alt="EchoSecure Logo" className="mt-2 w-16 h-16 lg:w-20 lg:h-20 object-cover" />
            </div>
          </div>
        </div>
        <h2 className="text-xl lg:text-2xl font-bold">Welcome to EchoSecure!</h2>
        <p className="text-sm lg:text-base text-base-content/60">Select a conversation from the sidebar to start chatting</p>
      </div>
    </div>
  );
};

export default NoChatSelected;