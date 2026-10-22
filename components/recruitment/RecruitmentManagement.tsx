"use client";

import { useState } from "react";
import Tabs from "@/components/ui/Tabs";
import JobsTab from "./JobsTab";
import CandidatesTab from "./CandidatesTab";
import InterviewsTab from "./InterviewsTab";

type TabId = "jobs" | "candidates" | "interviews";

export default function RecruitmentManagement() {
  const [tab, setTab] = useState<TabId>("jobs");
  const [jobFilter, setJobFilter] = useState<string>("");

  return (
    <div>
      <Tabs
        tabs={[
          { id: "jobs", label: "Job Openings" },
          { id: "candidates", label: "Candidates" },
          { id: "interviews", label: "Interviews" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "jobs" && (
        <JobsTab
          onViewCandidates={(jobId) => {
            setJobFilter(jobId);
            setTab("candidates");
          }}
        />
      )}
      {tab === "candidates" && <CandidatesTab initialJobId={jobFilter} />}
      {tab === "interviews" && <InterviewsTab />}
    </div>
  );
}
