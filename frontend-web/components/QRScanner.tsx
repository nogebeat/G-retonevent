'use client';

import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';

const QRScanner = ({ onScan }: { onScan: (result: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const initScanner = async () => {
      if (!videoRef.current) return;

      try {
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            if (result?.data) {
              onScan(result.data);
            }
          },
          {
            highlightScanRegion: true,
            returnDetailedScanResult: true,
          }
        );
        scannerRef.current = scanner;
        await scanner.start();
      } catch (err) {
        setError('Camera error: ' + (err instanceof Error ? err.message : String(err)));
      }
    };

    initScanner();

    return () => {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
    };
  }, [onScan]);

  return (
    <div>
      {error && <p className="text-red-500">{error}</p>}
      <video ref={videoRef} className="w-full max-w-md rounded-lg shadow" />
    </div>
  );
};

export default QRScanner;
