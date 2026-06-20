'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, Music2, CheckCircle2 } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Card } from '@/components/ui/primitives';
import { createMemberSchema, type CreateMemberFormValues } from '@/lib/validators/schemas';
import { useCreateMember } from '@/lib/hooks/use-members';

interface QrResult {
  member_id: string;
  full_name: string;
  instrument: string;
  qrDataUrl: string;
}

const INSTRUMENTS = [
  { value: 'dhol', marathi: 'ढोल', english: 'Dhol' },
  { value: 'tasha', marathi: 'ताशा', english: 'Tasha' },
  { value: 'tool', marathi: 'टोल', english: 'Tool' },
  { value: 'dhwaj', marathi: 'ध्वज', english: 'Dhwaj' },
] as const;

const AVAILABILITY = [
  { value: 'daily', label: 'Daily' },
  { value: 'two_days_week', label: '2 Days in Week' },
  { value: 'three_days_week', label: '3 Days in Week' },
  { value: 'other', label: 'Other' },
] as const;

const STATUS_OPTIONS = [
  { value: 'school_student', label: 'School Student' },
  { value: 'college_student', label: 'College Student' },
  { value: 'working_professional', label: 'Working Professional' },
  { value: 'business', label: 'Business / Self-employed' },
  { value: 'other', label: 'Other' },
] as const;

export default function NewMemberPage() {
  const router = useRouter();
  const createMember = useCreateMember();
  const [qrResult, setQrResult] = useState<QrResult | null>(null);

  const {
    register, handleSubmit, watch, control, setValue, getValues,
    formState: { errors },
  } = useForm<CreateMemberFormValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: { hasPriorPathakExp: false, declarationAccepted: false },
  });

  const fullName = watch('fullName');
  const hasPriorExp = watch('hasPriorPathakExp');

  // Track whether user has manually edited the signature field
  const sigEditedRef = useRef(false);

  // Keep signature in sync with full name unless user has manually changed it
  useEffect(() => {
    if (!sigEditedRef.current) {
      setValue('digitalSignature', fullName ?? '', { shouldValidate: false });
    }
  }, [fullName, setValue]);
  const currentStatus = watch('currentStatus');
  const availability = watch('availability');
  const instrument = watch('instrument');
  const hasHealthCondition = watch('hasHealthCondition');

  const statusNeedsOrg = ['school_student', 'college_student', 'working_professional', 'business', 'other'].includes(currentStatus as string);

  const onSubmit = async (values: CreateMemberFormValues) => {
    try {
      // Strip frontend-only fields and convert empty strings to undefined
      const { hasHealthCondition, ...rest } = values as any;
      const payload = Object.fromEntries(
        Object.entries(rest).map(([k, v]) => [k, v === '' ? undefined : v]),
      );
      const result = await createMember.mutateAsync(payload as any);
      setQrResult({
        member_id: result.member_id,
        full_name: values.fullName,
        instrument: values.instrument,
        qrDataUrl: result.qrDataUrl,
      });
      toast.success(`Member registered — ${result.member_id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const display = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Registration failed. Please try again.');
      toast.error(display);
    }
  };

  const downloadQr = (memberId: string, fullName: string, instr: string, qrDataUrl: string) => {
    // 2× scale for HD output — all drawing coords stay at 680×1020 logical pixels
    const W = 680, H = 1020, R = 32;
    const SCALE = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE; canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, R); ctx.fill();

    const headerH = 180;
    ctx.fillStyle = '#8A0112';
    ctx.beginPath(); ctx.roundRect(0, 0, W, headerH, [R, R, 0, 0]); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(56, 56, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('♪', 56, 63);

    ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '600 15px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('AVISHKAR DHOL TASHA PATHAK', 98, 47);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Member Card', 98, 78);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(0, headerH - 4, W, 4);

    const avatarY = headerH + 64;
    ctx.fillStyle = '#FDEEF0'; ctx.beginPath(); ctx.arc(W / 2, avatarY, 52, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#F5C2C7'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#8A0112'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
    const initials = fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
    ctx.fillText(initials, W / 2, avatarY + 12);

    ctx.fillStyle = '#1A1A2E'; ctx.font = 'bold 30px sans-serif';
    ctx.fillText(fullName, W / 2, avatarY + 76);

    const badge = instr.charAt(0).toUpperCase() + instr.slice(1);
    ctx.font = '600 15px sans-serif';
    const bW = ctx.measureText(badge).width + 36; const bY = avatarY + 94;
    ctx.fillStyle = '#FDEEF0'; ctx.beginPath(); ctx.roundRect(W / 2 - bW / 2, bY, bW, 30, 15); ctx.fill();
    ctx.fillStyle = '#8A0112'; ctx.fillText(badge, W / 2, bY + 20);

    const divY = bY + 52;
    ctx.strokeStyle = '#E0DFD8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, divY); ctx.lineTo(W - 60, divY); ctx.stroke();

    const qrImg = new Image();
    qrImg.onload = () => {
      const qrSize = 380, qrX = (W - qrSize) / 2, qrY = divY + 24;

      ctx.fillStyle = '#FAFAF7'; ctx.strokeStyle = '#E0DFD8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 16);
      ctx.fill(); ctx.stroke();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      const idY = qrY + qrSize + 36;
      ctx.fillStyle = '#FDEEF0'; ctx.beginPath(); ctx.roundRect(W / 2 - 130, idY, 260, 44, 10); ctx.fill();
      ctx.fillStyle = '#8A0112'; ctx.font = 'bold 19px monospace'; ctx.textAlign = 'center';
      ctx.fillText(memberId, W / 2, idY + 28);

      ctx.fillStyle = '#888888'; ctx.font = '14px sans-serif';
      ctx.fillText('Scan this QR code to mark attendance', W / 2, idY + 74);
      ctx.fillText('Keep this card safe', W / 2, idY + 94);

      ctx.fillStyle = '#8A0112'; ctx.beginPath(); ctx.roundRect(0, H - 52, W, 52, [0, 0, R, R]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '13px sans-serif';
      ctx.fillText('avishkardhtp.org', W / 2, H - 20);

      ctx.strokeStyle = '#E0DFD8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(1, 1, W - 2, H - 2, R); ctx.stroke();

      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png', 1.0);
      a.download = `member-card-${memberId}.png`;
      a.click();
    };
    qrImg.src = qrDataUrl;
  };

  if (qrResult) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          Member registered successfully!
        </div>

        <div className="w-80 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center gap-3 bg-primary px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Music2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-white/70">
                Avishkar Dhol Tasha Pathak
              </p>
              <p className="text-xs font-semibold text-white">Member Card</p>
            </div>
          </div>

          <div className="flex flex-col items-center px-6 py-8">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-accent text-lg font-bold text-primary">
              {qrResult.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <h3 className="text-base font-semibold text-ink">{qrResult.full_name}</h3>
            <p className="mt-0.5 text-xs capitalize text-ink-secondary">{qrResult.instrument}</p>
            <div className="my-5 h-px w-full bg-border" />
            <div className="rounded-xl bg-[#FAFAF7] p-3 ring-1 ring-border">
              <img
                src={qrResult.qrDataUrl}
                alt={`QR for ${qrResult.member_id}`}
                className="h-56 w-56 rounded-lg"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
            <div className="mt-4 rounded-md bg-background px-4 py-1.5">
              <p className="font-mono text-xs font-bold tracking-widest text-ink">
                {qrResult.member_id}
              </p>
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-secondary">
              Scan this QR code to mark attendance.<br />Keep this card safe.
            </p>
          </div>
        </div>

        <div className="flex w-80 flex-col gap-2">
          <Button onClick={() => downloadQr(qrResult.member_id, qrResult.full_name, qrResult.instrument, qrResult.qrDataUrl)}>
            <Download className="h-4 w-4" /> Download QR Card
          </Button>
          <Button variant="outline" onClick={() => router.push('/members')}>
            Go to Members List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Register New Member" />

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-5 p-6">

        {/* ── 1. Personal Information ─────────────────────── */}
        <Section title="Personal Information">
          <Grid>
            <Field label="Full Name" required error={errors.fullName?.message}>
              <Input {...register('fullName')} placeholder="e.g. Prathamesh Rane" />
            </Field>
            <Field label="Date of Birth" required error={errors.dateOfBirth?.message}>
              <Input type="date" {...register('dateOfBirth')} />
            </Field>
            <Field label="Mobile Number" required error={errors.mobileNumber?.message}>
              <Input {...register('mobileNumber')} placeholder="10-digit mobile number" maxLength={10} />
            </Field>
            <Field label="Alternate Mobile" error={errors.alternateMobile?.message}>
              <Input {...register('alternateMobile')} placeholder="Optional" maxLength={10} />
            </Field>
            <Field label="Gender" required error={errors.gender?.message}>
              <select {...register('gender')} className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm">
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Email Address" error={errors.email?.message}>
              <Input type="email" {...register('email')} placeholder="Optional" />
            </Field>
          </Grid>
          <Field label="Residential Address" required error={errors.address?.message} className="mt-4">
            <Textarea {...register('address')} rows={2} placeholder="Full residential address" />
          </Field>
        </Section>

        {/* ── 2. Current Status ───────────────────────────── */}
        <Section title="Current Status">
          <Field label="What is your current occupation / status?" required error={errors.currentStatus?.message}>
            <select {...register('currentStatus')} className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm">
              <option value="">Select status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          {statusNeedsOrg && (
            <Field
              label={
                currentStatus === 'school_student' ? 'School Name' :
                currentStatus === 'college_student' ? 'College Name' :
                currentStatus === 'working_professional' ? 'Organisation / Company Name' :
                currentStatus === 'business' ? 'Business Name' :
                'Please specify your current status'
              }
              required
              error={errors.currentStatusOrg?.message}
              className="mt-4"
            >
              <Input {...register('currentStatusOrg')} placeholder="Enter details" />
            </Field>
          )}
        </Section>

        {/* ── 3. Parents Information ──────────────────────── */}
        <Section title="Parents Information">
          <Grid>
            <Field label="Parent's Full Name" required error={errors.parentsName?.message}>
              <Input {...register('parentsName')} placeholder="Father / Mother full name" />
            </Field>
            <Field label="Parent's Mobile Number" required error={errors.parentsContact?.message}>
              <Input {...register('parentsContact')} placeholder="10-digit mobile number" maxLength={10} />
            </Field>
          </Grid>
        </Section>

        {/* ── 4. Instrument ───────────────────────────────── */}
        <Section title="Instrument">
          <p className="mb-3 text-sm text-ink-secondary">
            Which instrument would you like to play? <span className="text-danger">*</span>
          </p>
          <Controller
            control={control}
            name="instrument"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {INSTRUMENTS.map((inst) => (
                  <button
                    key={inst.value}
                    type="button"
                    onClick={() => field.onChange(inst.value)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-4 text-center transition-all ${
                      field.value === inst.value
                        ? 'border-primary bg-primary-accent text-primary'
                        : 'border-border bg-surface text-ink hover:border-primary/40'
                    }`}
                  >
                    <span className="text-2xl font-bold">{inst.marathi}</span>
                    <span className="text-xs font-medium">{inst.english}</span>
                  </button>
                ))}
              </div>
            )}
          />
          {errors.instrument && (
            <p className="mt-2 text-xs text-danger">{errors.instrument.message}</p>
          )}
        </Section>

        {/* ── 5. Availability ─────────────────────────────── */}
        <Section title="Availability for Practice Sessions">
          <p className="mb-3 text-sm text-ink-secondary">
            How often are you available for practice sessions? <span className="text-danger">*</span>
          </p>
          <Controller
            control={control}
            name="availability"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {AVAILABILITY.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => field.onChange(a.value)}
                    className={`rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all ${
                      field.value === a.value
                        ? 'border-primary bg-primary-accent text-primary'
                        : 'border-border bg-surface text-ink hover:border-primary/40'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          />
          {errors.availability && (
            <p className="mt-2 text-xs text-danger">{errors.availability.message}</p>
          )}
          {availability === 'other' && (
            <Field label="Please describe your availability" required error={errors.availabilityOther?.message} className="mt-3">
              <Input {...register('availabilityOther')} placeholder="e.g. Weekends only, once a month…" />
            </Field>
          )}
        </Section>

        {/* ── 6. Prior Pathak Experience ──────────────────── */}
        <Section title="Prior Pathak Experience">
          <p className="mb-3 text-sm text-ink-secondary">
            Have you been in any other Dhol Tasha Pathak in the past? <span className="text-danger">*</span>
          </p>
          <Controller
            control={control}
            name="hasPriorPathakExp"
            render={({ field }) => (
              <div className="flex gap-3">
                {[{ val: false, label: 'No' }, { val: true, label: 'Yes' }].map(({ val, label }) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => field.onChange(val)}
                    className={`rounded-lg border-2 px-8 py-2.5 text-sm font-medium transition-all ${
                      field.value === val
                        ? 'border-primary bg-primary-accent text-primary'
                        : 'border-border bg-surface text-ink hover:border-primary/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          />
          {hasPriorExp && (
            <Field label="Name of the Pathak" required error={errors.priorPathakName?.message} className="mt-3">
              <Input {...register('priorPathakName')} placeholder="Enter the name of the Pathak" />
            </Field>
          )}
        </Section>

        {/* ── 7. Why Join ─────────────────────────────────── */}
        <Section title="About You">
          <Field label="Why do you want to join Avishkar Dhol Tasha Pathak?" required error={errors.joiningReason?.message}>
            <Textarea {...register('joiningReason')} rows={3} placeholder="Tell us about your interest and motivation…" />
          </Field>
        </Section>

        {/* ── 8. Health Information ───────────────────────── */}
        <Section title="Health Information">
          <p className="mb-3 text-sm text-ink-secondary">
            Do you have any physical limitations or health conditions we should be aware of?{' '}
            <span className="text-danger">*</span>
          </p>
          <Controller
            control={control}
            name="hasHealthCondition"
            render={({ field }) => (
              <div className="flex gap-3">
                {[{ val: 'no', label: 'No' }, { val: 'yes', label: 'Yes' }].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => field.onChange(val)}
                    className={`rounded-lg border-2 px-8 py-2.5 text-sm font-medium transition-all ${
                      field.value === val
                        ? 'border-primary bg-primary-accent text-primary'
                        : 'border-border bg-surface text-ink hover:border-primary/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          />
          {errors.hasHealthCondition && (
            <p className="mt-2 text-xs text-danger">{errors.hasHealthCondition.message}</p>
          )}
          {hasHealthCondition === 'yes' && (
            <Field label="If yes, please specify" required error={errors.healthDetails?.message} className="mt-3">
              <Textarea {...register('healthDetails')} rows={3} placeholder="Describe your health condition or physical limitation…" />
            </Field>
          )}
        </Section>

        {/* ── 9. Identification ───────────────────────────── */}
        <Section title="Identification">
          <Grid>
            <Field label="Aadhaar Number" required error={errors.aadhaarNumber?.message}>
              <Input {...register('aadhaarNumber')} placeholder="12-digit Aadhaar number" maxLength={12} />
            </Field>
            <Field label="PAN Number" error={errors.panNumber?.message}>
              <Input {...register('panNumber')} placeholder="ABCDE1234F" className="uppercase" />
            </Field>
          </Grid>
        </Section>

        {/* ── 10. Declaration ─────────────────────────────── */}
        <Section title="Declaration">
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              {...register('declarationAccepted')}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span className="text-sm text-ink-secondary">
              I confirm that all information provided is accurate and I agree to abide by
              Avishkar Dhol Tasha Pathak&apos;s rules and regulations.
            </span>
          </label>
          {errors.declarationAccepted && (
            <p className="mt-1 text-xs text-danger">{errors.declarationAccepted.message}</p>
          )}
          <Field label="Digital Signature" required error={errors.digitalSignature?.message} className="mt-4">
            <Input
              {...register('digitalSignature', {
                onChange: () => { sigEditedRef.current = true; },
              })}
              placeholder="Type your full name as signature"
            />
            <p className="mt-1 text-xs text-ink-secondary">
              Auto-filled from full name — edit if needed.
            </p>
          </Field>
        </Section>

        <div className="flex justify-end gap-3 pb-10">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={createMember.isPending}>
            Register Member
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">
        {title}
      </h2>
      {children}
    </Card>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label, required, error, className, children,
}: {
  label: string; required?: boolean; error?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
