import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface QrScannerProps {
  onScan: (code: string) => void;
}

const QrScanner = ({ onScan }: QrScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader";

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScan = async () => {
    setScanning(true);
    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (text) => {
          onScan(text);
          scanner.stop().catch(() => {});
          setScanning(false);
        },
        () => {} // ignore errors during scanning
      );
    } catch {
      setScanning(false);
    }
  };

  const stopScan = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {});
    }
    setScanning(false);
  };

  return (
    <div className="space-y-2">
      {scanning ? (
        <>
          <div id={containerId} className="rounded-lg overflow-hidden" />
          <Button variant="outline" className="w-full" onClick={stopScan}>
            <X className="h-4 w-4 mr-2" /> Cancel Scan
          </Button>
        </>
      ) : (
        <Button variant="outline" className="w-full" onClick={startScan}>
          <Camera className="h-4 w-4 mr-2" /> Scan QR Code
        </Button>
      )}
    </div>
  );
};

export default QrScanner;
