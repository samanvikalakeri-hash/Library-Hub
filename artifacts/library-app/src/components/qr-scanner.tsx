import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { BookOpen, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface QrScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScanState = "scanning" | "found" | "notfound" | "error";

export function QrScanner({ open, onOpenChange }: QrScannerProps) {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [scannedIsbn, setScannedIsbn] = useState<string>("");
  const [foundBookId, setFoundBookId] = useState<number | null>(null);
  const [foundBookTitle, setFoundBookTitle] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const stopScanner = () => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch {}
      controlsRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      stopScanner();
      setScanState("scanning");
      setScannedIsbn("");
      setFoundBookId(null);
      setFoundBookTitle("");
      setErrorMsg("");
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      if (!videoRef.current) return;

      try {
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          async (result, err) => {
            if (cancelled) return;
            if (!result) return;

            const raw = result.getText();
            const isbn = raw.replace(/[^0-9X]/gi, "");
            if (isbn.length < 10) return;

            controls.stop();
            controlsRef.current = null;
            setScannedIsbn(isbn);

            try {
              const res = await fetch(`/api/books?search=${encodeURIComponent(isbn)}`);
              const books = await res.json();
              const match = Array.isArray(books)
                ? books.find((b: any) => b.isbn?.replace(/[^0-9X]/gi, "") === isbn)
                : null;

              if (!cancelled) {
                if (match) {
                  setFoundBookId(match.id);
                  setFoundBookTitle(match.title);
                  setScanState("found");
                } else {
                  setScanState("notfound");
                }
              }
            } catch {
              if (!cancelled) {
                setErrorMsg("Failed to look up book. Check your connection.");
                setScanState("error");
              }
            }
          }
        );

        if (!cancelled) {
          controlsRef.current = controls;
        } else {
          controls.stop();
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg =
            err?.message?.includes("Permission") || err?.name === "NotAllowedError"
              ? "Camera access denied. Please allow camera permissions and try again."
              : err?.message ?? "Camera not available on this device.";
          setErrorMsg(msg);
          setScanState("error");
        }
      }
    };

    const timer = setTimeout(startScanner, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopScanner();
    };
  }, [open]);

  const handleViewBook = () => {
    onOpenChange(false);
    if (foundBookId) navigate(`/books/${foundBookId}`);
  };

  const handleScanAgain = () => {
    stopScanner();
    setScanState("scanning");
    setScannedIsbn("");
    setFoundBookId(null);
    setFoundBookTitle("");
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 150);
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
                Point your camera at the book's ISBN barcode
              </p>
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-20 border-2 border-teal-400 rounded opacity-70" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Scanning for barcodes…
              </p>
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
                <p className="text-xs text-muted-foreground mt-1">
                  This ISBN isn't in your library yet. Add it via "Add Book".
                </p>
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
