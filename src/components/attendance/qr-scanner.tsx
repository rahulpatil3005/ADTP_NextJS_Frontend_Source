'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrScannerProps {
  onScan: (payload: string) => void;
  paused?: boolean;
}

export function QrScanner({ onScan, paused = false }: QrScannerProps) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>('');
  const elementId = 'qr-scanner-element';

  const startScanner = async () => {
    setError(null);
    try {
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) throw new Error('No camera found on this device');

      const cam = cameras.find((c) => /back|rear|environment/i.test(c.label)) ?? cameras[0];

      await scanner.start(
        cam.id,
        { fps: 15, qrbox: { width: 280, height: 280 }, aspectRatio: 1 },
        (text) => {
          // Deduplicate: ignore if same QR fired again within same paused window
          if (paused || text === lastScannedRef.current) return;
          lastScannedRef.current = text;
          // Clear last scanned after 4s so rescanning same QR is possible later
          setTimeout(() => { lastScannedRef.current = ''; }, 4000);
          onScan(text);
        },
        undefined,
      );
      setActive(true);
    } catch (err: any) {
      setError(err?.message ?? 'Camera access denied');
      setActive(false);
    }
  };

  const stopScanner = async () => {
    try {
      await scannerRef.current?.stop();
      scannerRef.current = null;
    } catch {}
    setActive(false);
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera viewfinder */}
      <div
        className={`relative w-full max-w-xs overflow-hidden rounded-xl border-2 transition-colors ${
          active ? 'border-primary bg-black' : 'border-border bg-background'
        }`}
        style={{ aspectRatio: '1' }}
      >
        <div id={elementId} className="h-full w-full" />

        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-secondary">
            <Camera className="h-10 w-10 opacity-30" />
            <p className="text-xs">Camera off</p>
          </div>
        )}

        {/* Scan frame corners */}
        {active && (
          <>
            <div className="pointer-events-none absolute left-6 top-6 h-8 w-8 border-l-2 border-t-2 border-primary rounded-tl-sm" />
            <div className="pointer-events-none absolute right-6 top-6 h-8 w-8 border-r-2 border-t-2 border-primary rounded-tr-sm" />
            <div className="pointer-events-none absolute bottom-6 left-6 h-8 w-8 border-b-2 border-l-2 border-primary rounded-bl-sm" />
            <div className="pointer-events-none absolute bottom-6 right-6 h-8 w-8 border-b-2 border-r-2 border-primary rounded-br-sm" />
          </>
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <Button
        size="sm"
        variant={active ? 'outline' : 'default'}
        onClick={active ? stopScanner : startScanner}
      >
        {active ? (
          <><CameraOff className="h-4 w-4" /> Stop Camera</>
        ) : (
          <><Camera className="h-4 w-4" /> Start Camera</>
        )}
      </Button>
    </div>
  );
}
