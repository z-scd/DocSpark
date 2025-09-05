"use client";

import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import * as React from "react";

const FileUploadComponent: React.FC = () => {
  const handleFileUploadButtonClick = () => {
    console.log("CLicked");
    const el = document.createElement("input");
    el.setAttribute("type", "file");
    el.setAttribute("accept", "application/pdf");
    el.addEventListener("change", async (ev) => {
      if (el.files && el.files.length > 0) {
        const file = el.files.item(0);
        if (file) {
          const formData = new FormData();
          formData.append("pdf", file);

          await fetch("http://localhost:8000/upload/pdf", {
            method: "POST",
            body: formData,
          });
        }
      }
    });
    el.click();
  };

  return (
    <>
      <Input type="file" />
      <div
        className="bg-slate-900 text-white shadow-2xl flex justify-center items-center p-4 border border-rounded"
        onClick={handleFileUploadButtonClick}
      >
        <h3>Upload Your PDF.</h3>
        <Upload />
      </div>
    </>
  );
};

export default FileUploadComponent;
