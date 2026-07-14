import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LocationPicker } from '@/components/LocationPicker';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { compressImageToBlob } from '@/lib/format';
import { uploadReportImage } from '@/lib/supabase';
import { Loader2, Dog, User as UserIcon, PawPrint, X } from 'lucide-react';

const TYPES = [
  { v: 'lost_pet', label: 'Lost Pet', icon: Dog, color: 'text-red-600', hint: 'I lost my pet' },
  { v: 'found_pet', label: 'Found Pet', icon: PawPrint, color: 'text-emerald-600', hint: 'I found a pet' },
  { v: 'missing_person', label: 'Missing Person', icon: UserIcon, color: 'text-red-600', hint: 'Someone is missing' },
  { v: 'found_person', label: 'Found Person', icon: UserIcon, color: 'text-emerald-600', hint: 'Found an unidentified person' },
];

export function ReportWizard({ open, onOpenChange }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [type, setType] = useState('lost_pet');
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('dog');
  const [breed, setBreed] = useState('');
  const [color, setColor] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [description, setDescription] = useState('');
  const [lastSeenAt, setLastSeenAt] = useState('');
  const [priority, setPriority] = useState('normal');
  const [location, setLocation] = useState(null);
  const [photos, setPhotos] = useState([]);   // [{url, thumb_url}]
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPerson = type === 'missing_person' || type === 'found_person';
  const canSubmit = useMemo(() => (description.trim().length >= 5) && !!(location && location.lat && location.lng), [description, location]);

  const reset = () => {
    setType('lost_pet'); setName(''); setSpecies('dog'); setBreed(''); setColor(''); setAge(''); setGender('');
    setDescription(''); setLastSeenAt(''); setPriority('normal'); setLocation(null); setPhotos([]);
  };

  const onFiles = async (files) => {
    if (!user) return;
    const arr = Array.from(files).slice(0, 6);
    setUploading(true);
    try {
      const uploaded = [];
      for (const f of arr) {
        try {
          const blob = await compressImageToBlob(f);
          const { url } = await uploadReportImage(user.user_id, blob);
          uploaded.push({ url });
        } catch (err) {
          console.error('upload failed', err);
          toast.error('Image upload failed', { description: err?.message?.slice(0, 120) });
        }
      }
      setPhotos((p) => [...p, ...uploaded].slice(0, 6));
    } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!user) { toast('Please sign in first'); onOpenChange(false); nav('/login'); return; }
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload = {
        type, name: name || undefined,
        species: isPerson ? undefined : species,
        breed: isPerson ? undefined : breed,
        color: color || undefined, age: age || undefined, gender: gender || undefined,
        description,
        last_seen_at: lastSeenAt ? new Date(lastSeenAt).toISOString() : undefined,
        priority, location, photos,
      };
      const { data } = await api.post('/cases', payload);
      toast.success('Report submitted', { description: data.matches?.length ? `${data.matches.length} possible match(es) found.` : 'We will alert you when we find matches.' });
      const id = data.case.case_id;
      reset(); onOpenChange(false); nav(`/cases/${id}`);
    } catch (e) {
      toast.error('Could not submit report', { description: e?.response?.data?.detail || e?.message || 'Please try again.' });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Report a case</DialogTitle>
          <DialogDescription>Fast, private, and useful — takes under 30 seconds.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <Label className="mb-2 block">What are you reporting?</Label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.v} type="button" onClick={() => setType(t.v)}
                    className={`text-left rounded-lg border p-3 transition-colors hover:border-primary/60 ${type === t.v ? 'border-primary bg-primary/5' : 'bg-card'}`}
                    data-testid={`report-type-${t.v}`}>
                    <div className={`flex items-center gap-2 font-medium ${t.color}`}><Icon className="h-4 w-4" />{t.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{t.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name (if known)</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isPerson ? 'e.g. Aarav' : 'e.g. Bruno'} data-testid="report-name-input" /></div>
            {!isPerson && (<div><Label>Species</Label><Input value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="dog, cat, cow, parrot…" data-testid="report-species-input" /></div>)}
            {!isPerson && (<div><Label>Breed</Label><Input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Indie / Labrador" data-testid="report-breed-input" /></div>)}
            <div><Label>Color / Distinctive markings</Label><Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. brown with white paws" data-testid="report-color-input" /></div>
            <div><Label>Age</Label><Input value={age} onChange={(e) => setAge(e.target.value)} placeholder="approx." data-testid="report-age-input" /></div>
            <div><Label>Gender</Label><Input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="male / female / unknown" data-testid="report-gender-input" /></div>
            <div className="col-span-2"><Label>Last seen (date & time)</Label><Input type="datetime-local" value={lastSeenAt} onChange={(e) => setLastSeenAt(e.target.value)} data-testid="report-last-seen-input" /></div>
          </div>
          <div><Label>Description *</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what happened, distinctive features, collar, tag, temperament, medical needs…" rows={4} required data-testid="report-description-input" /></div>
          <div><Label>Where? (pin the location)</Label><LocationPicker value={location} onChange={setLocation} /></div>
          <div>
            <Label>Priority</Label>
            <RadioGroup value={priority} onValueChange={setPriority} className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="normal" data-testid="report-priority-normal" />Normal</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="high" data-testid="report-priority-high" />High</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="critical" data-testid="report-priority-critical" />Critical</label>
            </RadioGroup>
          </div>
          <div>
            <Label>Photos (optional, up to 6)</Label>
            <input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} className="block mt-2 text-sm" data-testid="report-photo-upload-input" />
            {uploading && <div className="text-xs text-muted-foreground mt-1">Uploading…</div>}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                    <img src={p.url} alt={`photo-${i}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white grid place-items-center"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit || submitting || uploading} data-testid="report-wizard-submit-button">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : 'Submit report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
