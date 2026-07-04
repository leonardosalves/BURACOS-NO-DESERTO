import React, { useState } from "react";

const JsonTreeNode: React.FC<{ label?: string; value: any; depth?: number }> = ({ label, value, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  if (value === null) {
    return (
      <div style={{ paddingLeft: `${depth * 12}px` }} className="font-mono text-[11px] py-0.5 select-text">
        {label && <span className="text-gold-500 mr-1.5">{label}:</span>}
        <span className="text-zinc-500">null</span>
      </div>
    );
  }

  if (typeof value === "object") {
    const isArray = Array.isArray(value);
    const keys = Object.keys(value);
    const isEmpty = keys.length === 0;

    return (
      <div style={{ paddingLeft: `${depth * 12}px` }} className="font-mono text-[11px] py-0.5">
        <div
          onClick={() => !isEmpty && setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1.5 ${isEmpty ? "" : "cursor-pointer hover:text-white"} transition select-none`}
        >
          {!isEmpty && (
            <span className="text-zinc-500 text-[9px] shrink-0 font-bold">
              {isExpanded ? "▼" : "▶"}
            </span>
          )}
          {label && <span className="text-gold-500 mr-1.5">{label}:</span>}
          <span className="text-zinc-400">
            {isArray ? `Array[${keys.length}]` : `Object{${keys.length}}`}
          </span>
        </div>
        {isExpanded && !isEmpty && (
          <div className="border-l border-zinc-850 ml-2 pl-2 mt-1 space-y-0.5">
            {keys.map((key) => (
              <JsonTreeNode key={key} label={key} value={value[key]} depth={0} />
            ))}
          </div>
        )}
      </div>
    );
  }

  let valColor = "text-emerald-400";
  const valStr = JSON.stringify(value);
  if (typeof value === "number") {
    valColor = "text-blue-400";
  } else if (typeof value === "boolean") {
    valColor = "text-purple-400";
  }

  return (
    <div style={{ paddingLeft: `${depth * 12}px` }} className="font-mono text-[11px] py-0.5 select-text">
      {label && <span className="text-gold-500 mr-1.5">{label}:</span>}
      <span className={valColor}>{valStr}</span>
    </div>
  );
};

export const JsonTreeView: React.FC<{ value: any }> = ({ value }) => (
  <div className="space-y-1 font-sans">
    <JsonTreeNode value={value} depth={0} />
  </div>
);