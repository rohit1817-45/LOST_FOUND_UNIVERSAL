import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { MapPin, Clock, Dog, Cat, User as UserIcon } from 'lucide-react';
import { TYPE_LABEL, timeAgo, isLost, isPerson } from '@/lib/format';

export function CaseCard({ item, onClick }) {
  const lost = isLost(item.type);
  const person = isPerson(item.type);
  const Icon = person ? UserIcon : item.species?.toLowerCase() === 'cat' ? Cat : Dog;
  const photo = item.photos?.[0]?.data_url;
  return (
    <Link
      to={`/cases/${item.case_id}`}
      onClick={onClick}
      className="block group"
      data-testid="case-card"
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
        <AspectRatio ratio={16 / 10} className="bg-muted relative">
          {photo ? (
            <img src={photo} alt={item.name || TYPE_LABEL[item.type]} className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-secondary">
              <Icon className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge className={`${lost ? 'bg-red-600 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-600'} text-white`}>{TYPE_LABEL[item.type]}</Badge>
          </div>
          {item.distance_km !== undefined && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="backdrop-blur bg-background/70"><MapPin className="h-3 w-3 mr-1" />{item.distance_km} km</Badge>
            </div>
          )}
        </AspectRatio>
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-base leading-tight">{item.name || item.breed || TYPE_LABEL[item.type]}</div>
              <div className="text-xs text-muted-foreground">{[item.species, item.breed, item.color].filter(Boolean).join(' · ')}</div>
            </div>
            {item.verified && <Badge className="bg-emerald-600 text-white">Verified</Badge>}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location?.address?.split(',')[0] || 'Unknown'}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(item.created_at)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
