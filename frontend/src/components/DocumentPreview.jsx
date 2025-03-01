import React from "react";
import clsx from "clsx";
import { File, AppWindow, FileText, FileArchive, FileQuestion, X } from "lucide-react";

const DocumentPreview = ({ file, onRemove, showRemove = true, className }) => {
  if (!file) return null;

  // Safe check to handle file name and type
  const getFileIcon = () => {
    const ext = file.name?.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <File size={50} className="text-red-500" />;
      case "ppt":
      case "pptx":
        return <AppWindow size={50} className="text-orange-500" />;
      case "doc":
      case "docx":
        return <FileText size={50} className="text-blue-500" />;
      case "zip":
      case "rar":
        return <FileArchive size={50} className="text-yellow-500" />;
      default:
        return <FileQuestion size={50} className="text-gray-500" />;
    }
  };

  return (
    <div className={clsx("flex flex-col items-center justify-center border border-gray-300 rounded-lg p-4 w-48 shadow-md bg-white relative", className)}>
     {/* Conditionally Show X Button */}
     {showRemove && (
        <button onClick={onRemove} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
          <X size={20} />
        </button>
      )}

      {/* File icon */}
      <div className="mb-2">{getFileIcon()}</div>

      {/* File name */}
      <p className="text-sm text-center text-gray-700 font-medium">
        {file?.name?.length > 15 ? file.name.slice(0, 15) + "..." : file.name}
      </p>
    </div>
  );
};

export default DocumentPreview;
