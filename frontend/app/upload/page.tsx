"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpload = async () => {
    console.log("Analyze button clicked");

    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("File selected:", file.name);

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/analyze",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      localStorage.setItem("afiResult", JSON.stringify(response.data));

      router.push("/results");
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md space-y-6">
        <h1 className="text-2xl font-bold text-center">
          Upload Video for AFI Analysis
        </h1>

        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded-lg hover:opacity-80"
        >
          {loading ? "Analyzing Video..." : "Analyze"}
        </button>
      </div>
    </div>
  );
}