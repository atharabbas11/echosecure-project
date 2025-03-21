import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";


const BASE_URL =  "https://echosecure-backend.onrender.com";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Token might be expired, try to refresh it
        const success = await get().refreshToken();
        if (success) {
          // Retry the checkAuth request after refreshing the token
          try {
            const res = await axiosInstance.get("/auth/check");
            set({ authUser: res.data });
            get().connectSocket();
          } catch (retryError) {
            // console.log("Error in checkAuth after token refresh:", retryError);
            set({ authUser: null });
          }
        } else {
          set({ authUser: null });
        }
      } else {
        // console.log("Error in checkAuth:", error);
        set({ authUser: null });
      }
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('refreshToken='))
        ?.split('=')[1];
        
      console.log(refreshToken);
      if (!refreshToken) {
        // No refresh token found, do not log out, just return false
        console.error("No refresh token found in cookies");
        return false;
      }
      const res = await axiosInstance.post("/auth/refresh-token");
      toast.success("Token refreshed successfully");
      return true; // Indicate success
    } catch (error) {
      toast.error("Failed to refresh token");
      set({ authUser: null });
      return false; // Indicate failure
    }
  },

  verifyOTP: async (data) => {
    try {
      const res = await axiosInstance.post("/auth/verify-otp", data);
      set({ authUser: res.data });
      // Attach CSRF token to axios headers
      // axiosInstance.defaults.headers.common["x-csrf-token"] = res.data.csrfToken;
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      throw error;
      // toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      return { success: true, message: res.data.message }; // Return success status
    } catch (error) {
      toast.error(error.response.data.message);
      return { success: false, message: error.response.data.message }; // Return failure status
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // logout: async () => {
  //   try {
  //     await axiosInstance.post("/auth/logout");
  //     set({ authUser: null });
  //     toast.success("Logged out successfully");
  //     get().disconnectSocket();
  //   } catch (error) {
  //     toast.error(error.response.data.message);
  //   }
  // },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
  
      // Manually clear cookies as a fallback
      document.cookie = "accessToken=; Path=/; Domain=.onrender.com; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=None; HttpOnly";
      document.cookie = "refreshToken=; Path=/; Domain=.onrender.com; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=None; HttpOnly";
      document.cookie = "sessionId=; Path=/; Domain=.onrender.com; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=None; HttpOnly";
      document.cookie = "csrfToken=; Path=/; Domain=.onrender.com; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=None; HttpOnly";
  
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },
  
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      // console.log("error in update profile:", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
