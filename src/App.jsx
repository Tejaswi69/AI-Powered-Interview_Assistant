import React, { useState, useEffect } from "react";
import { Tabs } from "antd";
import ResumeUpload from "./components/ResumeUpload/ResumeUpload.jsx";
import InterviewerDashboard from "./components/InterviewerDashboard/InterviewerDashboard.jsx";

export default function App() {
  // Always start with interviewee tab
  const [activeTab, setActiveTab] = useState("interviewee");

  useEffect(() => {
    // Clear all localStorage on mount to ensure fresh start
    localStorage.clear();
  }, []);

  const tabItems = [
    {
      key: "interviewee",
      label: "Interviewee",
      children: <ResumeUpload />,
    },
    {
      key: "interviewer",
      label: "Interviewer",
      children: <InterviewerDashboard />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        AI-Powered Interview Assistant
      </h1>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        items={tabItems}
      />
    </div>
  );
}
