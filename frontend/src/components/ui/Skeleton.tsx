'use client';

interface SkeletonProps {
  className?: string;
  rows?: number;
  columns?: number;
}

export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`} />
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <SkeletonRow className="h-4 w-24" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-t dark:border-slate-700">
                {Array.from({ length: columns }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <SkeletonRow className={`h-4 ${j === 0 ? 'w-32' : 'w-20'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-6 ${className}`}>
      <SkeletonRow className="h-6 w-48 mb-4" />
      <SkeletonRow className="h-4 w-full mb-2" />
      <SkeletonRow className="h-4 w-3/4" />
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-5">
          <SkeletonRow className="h-4 w-24 mb-3" />
          <SkeletonRow className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonRow className="h-4 w-24" />
              <SkeletonRow className="h-8 w-12" />
            </div>
            <SkeletonRow className="h-10 w-10 rounded-lg" />
          </div>
          <SkeletonRow className="h-3 w-20 mt-3" />
        </div>
      ))}
    </div>
  );
}

export default function Skeleton({ rows = 5, columns = 4 }: SkeletonProps) {
  return <SkeletonTable rows={rows} columns={columns} />;
}
