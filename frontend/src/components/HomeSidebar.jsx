import { useState } from "react";
import eslogo from '../images/eslogo.png';
import { MessageSquareMore, UsersRound } from 'lucide-react';
import { useChatStore } from "../store/useChatStore";

const HomeSidebar = ({ onToggleChat }) => {
  return (
    <div className="w-16 lg:w-20 bg-base-300 p-2 lg:p-4 flex flex-col items-center">
      <div className="mb-4">
        <img src={eslogo} alt="EchoSecure Logo" className="mx-auto w-10 h-10 lg:w-12 lg:h-12 object-cover" />
        <p className="text-xs font-bold hidden lg:block">EchoSecure</p>
      </div>
      <button onClick={() => onToggleChat(false)} className="p-2 mb-4 rounded-full hover:bg-gray-700">
        <MessageSquareMore className="w-5 h-5 lg:w-6 lg:h-6" />
      </button>
      <button onClick={() => onToggleChat(true)} className="p-2 rounded-full hover:bg-gray-700">
        <UsersRound className="w-5 h-5 lg:w-6 lg:h-6" />
      </button>
    </div>
  );
};

export default HomeSidebar;