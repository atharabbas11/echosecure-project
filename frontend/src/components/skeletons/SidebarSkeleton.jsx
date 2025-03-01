import { Users } from "lucide-react";
import { useMediaQuery } from "react-responsive";

const SidebarSkeleton = () => {
  // Create 8 skeleton items
  const skeletonContacts = Array(8).fill(null);
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  return (
    <aside
      className={`h-full ${isMobile ? 'w-full' : 'w-20 lg:w-96'} ${
        !isMobile ? 'border-r border-base-300' : ''
      } flex flex-col transition-all duration-200 relative`}
    >
      {/* Header */}
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6" />
          {/* Show "Contacts" text on all screens */}
          <span className="font-medium">Contacts</span>
        </div>
      </div>

      {/* Skeleton Contacts */}
      <div className="overflow-y-auto w-full py-3">
        {skeletonContacts.map((_, idx) => (
          <div key={idx} className="w-full p-3 flex items-center gap-3">
            {/* Avatar skeleton */}
            <div className="relative mx-auto lg:mx-0">
              <div className="skeleton size-12 rounded-full" />
            </div>

            {/* User info skeleton - visible on all screens */}
            <div className="text-left min-w-0 flex-1">
              <div className="skeleton h-4 w-32 mb-2" />
              <div className="skeleton h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;