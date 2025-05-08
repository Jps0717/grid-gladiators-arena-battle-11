
import React from "react";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";

interface CooldownIndicatorProps {
  isActive: boolean;
  className?: string;
}

const CooldownIndicator: React.FC<CooldownIndicatorProps> = ({ 
  isActive,
  className
}) => {
  if (!isActive) return null;

  return (
    <div className={cn(
      "absolute inset-0 bg-slate-900/60 rounded-lg flex items-center justify-center overflow-hidden",
      className
    )}>
      <LoaderCircle className="w-6 h-6 text-slate-300 animate-spin" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-40" />
    </div>
  );
};

export default CooldownIndicator;
