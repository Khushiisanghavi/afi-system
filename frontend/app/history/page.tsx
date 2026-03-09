"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const response = await axios.get("http://127.0.0.1:8000/history");
      setHistory(response.data);
    };

    fetchHistory();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">

      <h1 className="text-3xl font-bold">Analysis History</h1>

      <div className="bg-white rounded-xl shadow p-6">

        <table className="w-full text-left">

          <thead>
            <tr className="border-b">
              <th className="py-2">Video</th>
              <th>AFI Score</th>
              <th>Category</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>

            {history.map((item) => (
              <tr key={item.id} className="border-b">

                <td className="py-2">{item.video_name}</td>

                <td>{item.final_afi.toFixed(3)}</td>

                <td>{item.category}</td>

                <td>
                  {new Date(item.created_at).toLocaleDateString()}
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}