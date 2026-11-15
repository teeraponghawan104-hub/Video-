import React, { useState } from 'react';
import {
  Download,
  Trash2,
  CheckCircle2,
  Loader2,
  Film,
  Search,
  Play,
  Plus,
} from 'lucide-react';

export interface RenderJob {
  id: string;
  clipTitle: string;
  platformName: string;
  platformLabel: string;
  resolution: string;
  fps: number;
  bitrateMbps: number;
  estimatedSizeMb: number;
  casSharpness: number;
  status: 'queued' | 'processing' | 'completed';
  progressPct: number;
  createdAt: string;
  downloadUrl?: string;
  downloadFilename?: string;
}

interface RenderQueuePanelProps {
  jobs: RenderJob[];
  onProcessAllQueued: () => void;
  onRemoveJob: (id: string) => void;
  onAddCurrentToQueue: () => void;
}

export const RenderQueuePanel: React.FC<RenderQueuePanelProps> = ({
  jobs,
  onProcessAllQueued,
  onRemoveJob,
  onAddCurrentToQueue,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredJobs = jobs.filter((job) => {
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'completed'
        ? job.status === 'completed'
        : job.status === 'processing' || job.status === 'queued';
    const matchesSearch =
      job.clipTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.platformName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.resolution.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const queuedCount = jobs.filter((j) => j.status === 'queued').length;
  const completedCount = jobs.filter((j) => j.status === 'completed').length;

  return (
    <section
      id="render-queue"
      aria-labelledby="render-queue-heading"
      className="bg-[#111827] border border-slate-800/90 rounded-xl overflow-hidden"
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-slate-800">
        <div>
          <h2 id="render-queue-heading" className="text-base font-semibold text-slate-100">
            คิวเรนเดอร์และไฟล์ที่ส่งออก (Batch Upscale & Export Queue)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
            ทั้งหมด {jobs.length} รายการ · เสร็จสมบูรณ์ {completedCount} · รอประมวลผล {queuedCount}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อคลิปหรือแพลตฟอร์ม..."
              aria-label="ค้นหารายการในคิวเรนเดอร์"
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Interactive Status Filter Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            {(
              [
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'completed', label: 'พร้อมดาวน์โหลด' },
                { id: 'processing', label: 'กำลังทำ / รอคิว' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filterStatus === tab.id
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {queuedCount > 0 && (
            <button
              type="button"
              onClick={onProcessAllQueued}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-orange-500 text-slate-950 rounded-lg hover:bg-orange-400 transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>เรนเดอร์คิวที่รอทั้งหมด ({queuedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Table or Empty State */}
      {filteredJobs.length === 0 ? (
        <div className="p-10 text-center space-y-3">
          <Film className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">
              ยังไม่มีรายการในหมวดหมู่นี้
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              คุณสามารถเพิ่มการตั้งค่าอัพสเกลปัจจุบันเข้าสู่คิวเพื่อประมวลผลหลายแพลตฟอร์มพร้อมกัน (เช่น TikTok 1080p60 คู่กับ YouTube Shorts 4K)
            </p>
          </div>
          <button
            type="button"
            onClick={onAddCurrentToQueue}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-orange-400" />
            <span>เพิ่มงานปัจจุบันเข้าคิวเรนเดอร์</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 bg-slate-900/50">
                <th className="py-3 px-5">ชื่อวิดีโอและพรีเซ็ต</th>
                <th className="py-3 px-4">แพลตฟอร์ม</th>
                <th className="py-3 px-4 text-right">ความละเอียด / FPS</th>
                <th className="py-3 px-4 text-right">บิตเรต / ขนาดไฟล์</th>
                <th className="py-3 px-4">สถานะการอัพสเกล</th>
                <th className="py-3 px-5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-slate-800/35 transition-colors"
                >
                  <td className="py-3 px-5">
                    <div className="font-medium text-slate-100">{job.clipTitle}</div>
                    <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                      CAS Sharpness {job.casSharpness}% · เพิ่มเมื่อ {job.createdAt}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-300">
                    <span>{job.platformName}</span>
                  </td>

                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                    {job.resolution} · {job.fps}fps
                  </td>

                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                    {job.bitrateMbps} Mbps · ~{job.estimatedSizeMb} MB
                  </td>

                  <td className="py-3 px-4">
                    {job.status === 'completed' ? (
                      <div className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>สำเร็จ 100%</span>
                      </div>
                    ) : job.status === 'processing' ? (
                      <div className="space-y-1 max-w-[160px]">
                        <div className="flex items-center justify-between text-orange-400 font-mono tabular-nums text-[11px]">
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            กำลังเรนเดอร์
                          </span>
                          <span>{job.progressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${job.progressPct}%` }}
                            className="h-full bg-orange-500 transition-all duration-150"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">รอคิวประมวลผล</span>
                    )}
                  </td>

                  <td className="py-3 px-5 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      {job.status === 'completed' && job.downloadUrl && (
                        <a
                          href={job.downloadUrl}
                          download={job.downloadFilename || `upscaled-${job.id}.webm`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 text-slate-950 rounded-md hover:bg-orange-400 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>ดาวน์โหลดไฟล์</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveJob(job.id)}
                        aria-label={`ลบงาน ${job.clipTitle}`}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
