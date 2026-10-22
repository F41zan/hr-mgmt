import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EmployeeDetailView from "@/components/employees/EmployeeDetailView";

export const metadata: Metadata = {
  title: "Employee Details | HR Management System",
  description: "View employee information",
};

export default function EmployeeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/employees"
          className="inline-flex items-center text-sm text-gray-600 hover:text-primary transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Employees
        </Link>
      </div>

      <EmployeeDetailView employeeId={params.id} />
    </div>
  );
}
