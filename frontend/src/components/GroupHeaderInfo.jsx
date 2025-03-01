import { useEffect, useState } from "react";
import { X, Check, Camera, MoreVertical, Pencil } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import GroupDeleteConfirmationModal from './GroupDeletedConfirmationModel';
import GroupMedia from "./GroupMedia";
import GroupMediaSection from "./GroupMediaSection";

const GroupHeaderInfo = ({ onClose, onShowMedia }) => {
  const { selectedGroup, addMembersToGroup, removeMembersFromGroup, makeAdmin, removeAdmin, isUpdatingGroupProfile, updateGroupProfilePic, updateGroupDetails, deleteGroup, checkIfUserIsAdmin } = useChatStore();
  const { authUser } = useAuthStore();
  const [nonMembers, setNonMembers] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [membersToRemove, setMembersToRemove] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [memberOptions, setMemberOptions] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [newGroupName, setNewGroupName] = useState(selectedGroup.name);
  const [newGroupDescription, setNewGroupDescription] = useState(selectedGroup.description);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isMediaVisible, setIsMediaVisible] = useState(false);
  const [isSeeMoreOpen, setIsSeeMoreOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); 

  useEffect(() => {
    if (selectedGroup) {
      fetchAdminStatus();
      fetchGroupMembers();
      fetchNonGroupMembers();
    }
  }, [selectedGroup]);

  const fetchAdminStatus = async () => {
    const adminStatus = await checkIfUserIsAdmin(selectedGroup._id);
    setIsAdmin(adminStatus);
  };
  
  const fetchGroupMembers = async () => {
    try {
      const res = await axiosInstance.get(`/groups/${selectedGroup._id}/members`);
      setGroupMembers(res.data.members);
      setGroupMembers(res.data);
    } catch (error) {
      // console.error("Error fetching group members:", error);
    }
  };

  const fetchNonGroupMembers = async () => {
    try {
      const res = await axiosInstance.get(`/groups/${selectedGroup._id}/non-members`);
      setNonMembers(res.data);
    } catch (error) {
      // console.error("Error fetching non-members:", error);
    }
  };

  const filteredNonMembers = nonMembers.filter((user) =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMembers = async () => {
    try {
      await addMembersToGroup(selectedGroup._id, selectedMembers);
      setSelectedMembers([]);
      fetchNonGroupMembers();
      toast.success("Members added successfully!");
    } catch (error) {
      // console.error("Error adding members:", error);
      toast.error("Failed to add members");
    }
  };

  const handleRemoveMembers = async (memberId) => {
    try {
      await removeMembersFromGroup(selectedGroup._id, [memberId]);
      fetchGroupMembers();
    } catch (error) {
      // console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleMakeAdmin = async (memberId) => {
    try {
      await makeAdmin(selectedGroup._id, memberId);
      toast.success("New admin assigned successfully!");
      fetchGroupMembers();
    } catch (error) {
      // console.error("Error making admin:", error);
      toast.error("Failed to assign new admin");
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    if (selectedGroup.admin.length === 1) {
      toast.error("Cannot remove the last admin.");
      return;
    }
    try {
      await removeAdmin(selectedGroup._id, adminId);
      fetchGroupMembers();
    } catch (error) {
      // console.error("Error removing admin:", error);
    }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result;
        setProfilePic(base64Data);
        try {
          await updateGroupProfilePic(selectedGroup._id, base64Data);
          toast.success("Profile picture updated successfully!");
        } catch (error) {
          // console.error("Error updating profile picture:", error);
          toast.error("Failed to update profile picture");
        }
      };
    }
  };

  const handleUpdateGroupDetails = async () => {
    try {
      await updateGroupDetails(selectedGroup._id, newGroupName, newGroupDescription);
      toast.success("Group details updated successfully!");
      setEditingName(false);
      setEditingDescription(false);
    } catch (error) {
      // console.error("Error updating group details:", error);
      toast.error("Failed to update group details");
    }
  };

  const handleCancelEdit = (type) => {
    if (type === "name") {
      setEditingName(false);
      setNewGroupName(selectedGroup.name);
    } else if (type === "description") {
      setEditingDescription(false);
      setNewGroupDescription(selectedGroup.description);
    }
  };

  const handleMemberOptions = (memberId) => {
    setMemberOptions((prev) => (prev === memberId ? null : memberId));
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroup(selectedGroup._id);
      toast.success("Group deleted successfully!");
    } catch (error) {
      // console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => { setIsModalOpen(true); };

  const closeModal = () => { setIsModalOpen(false); };

  const confirmDeletion = async () => {
    await handleDeleteGroup(selectedGroup._id);
    setIsModalOpen(false);
  };

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const openMediaModal = () => {
    setIsMediaModalOpen(true);
  };

  const closeMediaModal = () => {
    setIsMediaModalOpen(false);
  };

  const handleSeeMoreToggle = () => {
    setIsSeeMoreOpen(!isSeeMoreOpen);
  };

  return (
    <div className="bg-base-100 p-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Manage Group</h3>
        <button onClick={onClose}><X /></button>
      </div>

      {/* <div className="bg-base-100 p-4 w-full overflow-y-auto"> */}
      <div className="bg-base-100 p-4 w-full overflow-y-auto max-h-[calc(100vh-180px)]" style={{ backgroundColor: "transparent", scrollbarWidth: "thin", scrollbarColor: "#5A67D8 transparent" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="mb-0">
            {selectedGroup.profilePic ? (
              <img src={selectedGroup.profilePic} alt="Group Profile" className="size-32 rounded-full object-cover border-4"/>
            ) : (
              <img src="/avatar.png" alt="Group Profile" className="size-32 rounded-full object-cover border-4"/>
            )}
            {isAdmin && (
              <div className="relative">
                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-base-content hover:scale-105 p-2 rounded-full cursor-pointer transition-all duration-200">
                  <Camera className="w-5 h-5 text-base-200" />
                </label>
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  disabled={isUpdatingGroupProfile}
                />
              </div>
            )}
          </div>
          <p className="font-bold text-center">{selectedGroup.name}</p>
          <p className="text-center">Group · {selectedGroup.members.length} {selectedGroup.members.length === 1 ? "member" : "members"}</p>
          <div className="border-b w-full"></div>
        </div>

        <div className="mt-4">
          <GroupMedia groupId={selectedGroup._id} onSeeMoreClick={handleSeeMoreToggle} />
        </div>

        <button onClick={onShowMedia} className="btn btn-secondary w-full mt-2">
          View Media
        </button>

        <div className="mt-2 mb-4">
          <p className="font-medium mb-2">
            {selectedGroup.members.length}{" "}
            {selectedGroup.members.length === 1 ? "group member" : "group members"}
          </p>
          <ul>
            {groupMembers.map((member) => (
              <li key={member._id} className="items-center justify-between mb-2">
                <div className="flex items-center justify-between gap-2 mb-2 cursor-pointer p-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <img src={member.profilePic || "/avatar.png"} className="size-10 rounded-full border"/>
                    <span className={selectedGroup.admin.includes(member._id) ? "font-bold" : ""}>{member.fullName}</span>
                    {selectedGroup.admin.includes(member._id) && (<span className="font-bold text-sm ml-1"> - Admin</span>)}
                  </div>
                  <div className="relative">
                    <button onClick={() => handleMemberOptions(member._id)}>
                      <MoreVertical className="w-5 h-5 text-gray-500" />
                    </button>
                    {memberOptions === member._id && (
                      <div className="absolute right-0 top-6 bg-white shadow-lg rounded-lg py-2 px-3 text-sm z-10">
                        {selectedGroup.admin.includes(member._id) && selectedGroup.admin.length > 1 ? (
                          <button onClick={() => handleRemoveAdmin(member._id)} className="block text-red-500 hover:text-red-700">
                            Remove Admin
                          </button>
                        ) : null}

                        {!selectedGroup.admin.includes(member._id) && (
                          <button onClick={() => handleMakeAdmin(member._id)} className="block text-blue-500 hover:text-blue-700 w-20">
                            Make Admin
                          </button>
                        )}

                        {!(selectedGroup.admin.length === 1 && selectedGroup.admin.includes(member._id)) && (
                          <button onClick={() => handleRemoveMembers(member._id)} className="block text-red-500 hover:text-red-700">
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-b mb-4"></div>
        </div> 

        {isAdmin && (
          <>
            <div className="mb-4">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users to add" className="input input-bordered w-full mb-2"/>

              {/* Add scroll if more than 6 users */}
              <div className="space-y-2 max-h-[250px] overflow-y-auto" style={{ backgroundColor: "transparent", scrollbarWidth: "thin", scrollbarColor: "#5A67D8 transparent" }}>
                {filteredNonMembers.length > 0 ? (
                  filteredNonMembers.map((user) => (
                    <div key={user._id} className={`flex items-center justify-between cursor-pointer p-2 hover:bg-gray-100 rounded ${selectedMembers.includes(user._id) ? 'bg-base-300' : ''}`}
                      onClick={() => {
                        setSelectedMembers((prev) =>
                          prev.includes(user._id) ? prev.filter((id) => id !== user._id) : [...prev, user._id]
                        );
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="w-6 h-6 rounded-full"/>
                        <span>{user.fullName}</span>
                      </div>
                      {selectedMembers.includes(user._id) && (
                        <Check className="text-green-500" />
                      )}
                    </div>
                  ))
                ) : (
                  <div>No users found</div>
                )}
              </div>

              <button onClick={handleAddMembers} className="btn btn-primary w-full mt-2">
                Add Members
              </button>
            </div>
          </>
        )}

        {isAdmin && (
          <>
            <button className="bg-red-500 text-white py-2 px-4 rounded-md w-full" onClick={openModal}>
              Delete Group
            </button>
          </>
        )}

        <GroupDeleteConfirmationModal isOpen={isModalOpen} onClose={closeModal} onConfirm={confirmDeletion}/>
      </div>
    </div>
  );
};

export default GroupHeaderInfo;