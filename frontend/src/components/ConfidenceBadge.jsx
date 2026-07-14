import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck, ShieldAlert, HelpCircle } from 'lucide-react';

const MAP = {
  high: { cls: 'bg-emerald-600 hover:bg-emerald-600 text-white', icon: ShieldCheck, label: 'High' },
  medium: { cls: 'bg-amber-500 hover:bg-amber-500 text-white', icon: ShieldAlert, label: 'Medium' },
  low: { cls: 'bg-secondary text-secondary-foreground', icon: HelpCircle, label: 'Low' },
};

export function ConfidenceBadge({ confidence = 'low', score }) {
  const m = MAP[confidence] || MAP.low;
  const Icon = m.icon;
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${m.cls} gap-1`} data-testid="match-confidence-badge">
            <Icon className="h-3 w-3" /> {m.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Match confidence {typeof score === 'number' ? `· ${Math.round(score * 100)}%` : ''}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
