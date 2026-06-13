import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";

interface QrScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScanState = "scanning" | "found" | "notfound" | "error";

export function QrScanner({ open, onOpenChange }: QrScannerProps) {
  const [, navigate] = useLocation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [scannedIsbn, setScannedIsbn] = useState<string>("");
  const [foundBookId, setFoundBookId] = useState<number | null>(null);
  const [foundBookTitle, setFoundBookTitle] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!open) {
      stopScanner();
      setScanState("scanning");
      setScannedIsbn("");
      setFoundBookId(null);
      return;
    }

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          async (decodedText) => {
            const isbn = decodedText.replace(/[^0-9X]/gi, "");
            if (isbn.length < 10) return;

            await scanner.stop();
            setScannedIsbn(isbn);

            const result = await fetch(`/api/books?search=${encodeURIComponent(isbn)}`).then((r) => r.json());
            const match = Array.isArray(result) ? result.find((b: any) => b.isbn.replace(/[^0-9X]/gi, "") === isbn) : null;

            if (match) {
              setFoundBookId(match.id);
              setFoundBookTitle(match.title);
              setScanState("found");
            } else {
              setScanState("notfound");
            }
          },
          () => {}
        );
      } catch (err: any) {
        setErrorMsg(err?.message ?? "Camera access denied or not available");
        setScanState("error");
      }
    };

    const timer = setTimeout(startScanner, 300);
    return () => clearTimeout(timer);
  }, [open]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  };

  const handleViewBook = () => {
    onOpenChange(false);
    if (foundBookId) navigate(`/books/${foundBookId}`);
  };

  const handleScanAgain = () => {
    setScanState("scanning");
    setScannedIsbn("");
    setFoundBookId(null);
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 100);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopScanner(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-teal-600" />
            ISBN Barcode Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {scanState === "scanning" && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Point camera at the book's ISBN barcode
              </p>
              <div id="qr-reader" className="rounded-lg overflow-hidden" />
            </>
          )}

          {scanState === "found" && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="h-12 w-12 text-teal-600 mx-auto" />
              <div>
                <p className="font-semibold text-lg">{foundBookTitle}</p>
                <p className="text-sm text-muted-foreground">ISBN: {scannedIsbn}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleScanAgain}>
                  Scan again
                </Button>
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={handleViewBook}>
                  View book
                </Button>
              </div>
            </div>
          )}

          {scanState === "notfound" && (
            <div className="text-center space-y-4 py-4">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
              <div>
                <p className="font-semibold">Book not found</p>
                <p className="text-sm text-muted-foreground">ISBN: {scannedIsbn}</p>
              </div>
              <Button variant="outline" onClick={handleScanAgain}>Scan again</Button>
            </div>
          )}

          {scanState === "error" && (
            <div className="text-center space-y-4 py-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
