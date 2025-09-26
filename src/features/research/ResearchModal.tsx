// src/features/research/ResearchModal.tsx
"use client";

import { actions, WsSend } from "@/src/shared/ws/ctrlActions";
import { cn } from "@/src/shared/utils/cn";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPanel?: "local-economy" | "eda";
  sendAction: WsSend;
  wsStatus?: "connecting" | "open" | "closed";
};

const PANELS = [
  { key: "local-economy", title: "로컬 경제(카드 매출)" },
  { key: "eda", title: "EDA(탐색 지도)" },
];

export default function ResearchModal({ open, onOpenChange, defaultPanel = "local-economy", sendAction, wsStatus }: Props) {
  if (!open) return null;
  const disabled = wsStatus !== "open";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Research</h2>
          <button className="text-sm opacity-70 hover:opacity-100" onClick={() => onOpenChange(false)}>닫기</button>
        </div>

        {/* 탭 */}
        <div className="mb-6 flex gap-2">
          {PANELS.map((p) => (
            <span
              key={p.key}
              className={cn(
                "rounded-lg px-3 py-1 text-sm",
                p.key === defaultPanel ? "bg-black text-white" : "bg-neutral-100"
              )}
            >
              {p.title}
            </span>
          ))}
        </div>

        {/* 카드 리스트 */}
        {defaultPanel === "local-economy" && (
          <div className="grid grid-cols-2 gap-4">
            <Card
              title="카드 매출데이터 시각화"
              subtitle="서울 상권 카드 매출 패턴 맵/차트 송출"
              disabled={disabled}
              onClick={() => sendAction(actions.navigate("/research/local-economy?noIntro=1"))}
            />
            {/* 필요하면 추가 카드들… */}
          </div>
        )}

        {defaultPanel === "eda" && (
          <div className="grid grid-cols-2 gap-4">
            <Card
              title="EDA 지도 열기"
              subtitle="구/동 단위 경계 지도"
              disabled={disabled}
              onClick={() => sendAction(actions.navigate("/research/eda?noIntro=1"))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  onClick,
  disabled,
}: {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(
        "rounded-2xl border p-4 text-left transition hover:shadow-lg",
        disabled && "pointer-events-none opacity-50"
      )}
      onClick={onClick}
    >
      <div className="text-base font-medium">{title}</div>
      {subtitle && <div className="mt-1 text-sm text-neutral-500">{subtitle}</div>}
    </button>
  );
}
