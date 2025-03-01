import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Settings, LogOut, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import eslogo from '../images/eslogo.png';

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 backdrop-blur-lg bg-base-100/80">
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                <img src={eslogo} alt="EchoSecure Logo" className="mt-2 w-16 h-16 object-cover" />
              </div>
              <h1 className="text-lg font-bold">EchoSecure</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2 relative">
            {!authUser ? (
              <Link to="/settings" className="btn btn-sm gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            ) : (
              <div ref={dropdownRef}>
                <button onClick={toggleDropdown} className="flex items-center">
                  <img src={authUser.profilePic || "/avatar.png" } alt="Profile" className="w-8 h-8 rounded-full border-2 border-gray-300"/>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-base-200 rounded shadow-lg z-50">
                    <Link to="/settings" className="block px-4 py-2 hover:bg-gray-100">
                      <Settings className="w-4 h-4 inline" /> Settings
                    </Link>
                    <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">
                      <User className="w-4 h-4 inline" /> Profile
                    </Link>
                    <button onClick={logout} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
                      <LogOut className="w-4 h-4 inline" /> Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
