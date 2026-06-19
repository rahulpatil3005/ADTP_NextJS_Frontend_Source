'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';
import { createSessionSchema, type CreateSessionFormValues } from '@/lib/validators/schemas';
import { useCreateSession } from '@/lib/hooks/use-attendance';

const DEFAULT_LOCATION = 'Shiv Mandir, Umelman';
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function todayTitle() {
  const d = new Date();
  const dd  = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS[d.getMonth()];
  const day = DAYS[d.getDay()];
  return `${dd} ${mon} ${d.getFullYear()} (${day})`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function freshDefaults(): Partial<CreateSessionFormValues> {
  return {
    title: todayTitle(),
    sessionDate: todayISO(),
    locationName: DEFAULT_LOCATION,
    sessionType: 'practice',
    allowedRadiusMeters: 100,
    isLocationRestricted: false,
  };
}

export function CreateSessionDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createSession = useCreateSession();
  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: freshDefaults(),
  });

  // Re-populate defaults every time the dialog opens
  useEffect(() => {
    if (open) reset(freshDefaults() as CreateSessionFormValues);
  }, [open, reset]);

  const onSubmit = async (values: CreateSessionFormValues) => {
    try {
      await createSession.mutateAsync(values);
      toast.success('Session created');
      onOpenChange(false);
    } catch {
      toast.error('Failed to create session');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-ink">New Session</Dialog.Title>
            <Dialog.Close className="text-ink-secondary hover:text-ink">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div>
              <Label className="mb-1.5 block">Title</Label>
              <Input {...register('title')} placeholder="Monday Practice — June 16" />
              {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Type</Label>
                <select {...register('sessionType')} className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm">
                  <option value="practice">Practice</option>
                  <option value="event">Event</option>
                  <option value="workshop">Workshop</option>
                  <option value="rehearsal">Rehearsal</option>
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block">Date</Label>
                <Input type="date" {...register('sessionDate')} />
                {errors.sessionDate && <p className="mt-1 text-xs text-danger">{errors.sessionDate.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Start Time</Label>
                <Input type="time" {...register('startTime')} />
              </div>
              <div>
                <Label className="mb-1.5 block">End Time</Label>
                <Input type="time" {...register('endTime')} />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Location</Label>
              <Input {...register('locationName')} placeholder="Practice Ground, Vasai" />
            </div>

            <label className="flex items-center gap-2 pt-1">
              <input type="checkbox" {...register('isLocationRestricted')} className="h-4 w-4 rounded border-border" />
              <span className="text-sm text-ink-secondary">Restrict attendance to a geofence radius</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createSession.isPending}>
                Create Session
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
