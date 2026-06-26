import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { BookOpen, AlertCircle, CheckCircle2, Loader2, ScanLine, RefreshCw } from "lucide-react";

interface IsbnScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = "initializing" | "scanning" | "found" | "notfound" | "error";

export function IsbnScanner({ open, onOpenChange }: IsbnScannerProps) {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const [phase, setPhase] = useState<Phase>("initializing");
  const [foundTitle, setFoundTitle] = useState("");
  const [foundId, setFoundId] = useState<number | null>(null);
  const [scannedIsbn, setScannedIsbn] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const stopCamera = useCallback(() => {
    try { controlsRef.current?.stop(); } catch { /* ignore */ }
    controlsRef.current = null;
  }, []);

  // Start the scanner whenever the dialog opens
  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    let cancelled = false;

    const start = async () => {
      // Small delay so the video element renders before we attach
      await new Promise((r) => setTimeout(r, 300));
      if (cancelled || !videoRef.current) return;

      const reader = new BrowserMultiFormatReader();

      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          async (result, _err) => {
            // _err fires normally on every frame with no barcode — only act on a valid result
            if (cancelled || !result) return;

            const raw = result.getText();
            const isbn = raw.replace(/[^0-9Xx]/g, "").toUpperCase();
            // Validate before stopping — keep scanning if this isn't a real ISBN
            if (isbn.length < 10) return;

            // Valid ISBN candidate — stop camera now
            controls.stop();
            controlsRef.current = null;

            setScannedIsbn(isbn);
            setPhase("scanning"); // show "looking up..." state

            try {
              const res = await fetch(`/api/books?search=${encodeURIComponent(isbn)}`);
              if (!res.ok) throw new Error("API error");
              const books: any[] = await res.json();
              const match = Array.isArray(books)
                ? books.find((b) => b.isbn?.replace(/[^0-9Xx]/g, "").toUpperCase() === isbn)
                : null;

              if (cancelled) return;

              if (match) {
                setFoundId(match.id);
                setFoundTitle(match.title);
                setPhase("found");
              } else {
                setPhase("notfound");
              }
            } catch {
              if (!cancelled) {
                setErrorMsg("Could not look up the book. Check your connection.");
                setPhase("error");
              }
            }
          }
        );

        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
          setPhase("scanning");
        }
      } catch (err: any) {
        if (cancelled) return;
        const denied =
          err?.name === "NotAllowedError" || err?.message?.toLowerCase().includes("permission");
        setErrorMsg(
          denied
            ? "Camera access was denied. Please allow camera permissions in your browser and try again."
            : err?.message ?? "Camera is not available on this device."
        );
        setPhase("error");
      }
    };

    setPhase("initializing");
    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, stopCamera]);

  const handleViewBook = () => {
    onOpenChange(false);
    if (foundId) navigate(`/books/${foundId}`);
  };

  const handleScanAgain = () => {
    stopCamera();
    onOpenChange(false);
    setTimeout(() => {
      setPhase("initializing");
      setFoundTitle("");
      setFoundId(null);
      setScannedIsbn("");
      setErrorMsg("");
      onOpenChange(true);
    }, 100);
  };

  const handleClose = () => {
    stopCamera();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-teal-600" />
            ISBN Barcode Scanner
          </DialogTitle>
          <DialogDescription>
            Point the camera at a book's ISBN barcode to look it up instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera viewport — always rendered so the ref is available */}
          <div
            className={`relative rounded-lg overflow-hidden bg-black aspect-video ${
              phase === "scanning" || phase === "initializing" ? "block" : "hidden"
            }`}
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />
            {/* Scan-line overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-20 border-2 border-teal-400 rounded opacity-80" />
            </div>
          </div>

          {phase === "initializing" && (
            <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting camera…
            </p>
          )}

          {phase === "scanning" && (
            <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning for ISBN barcode…
            </p>
          )}

          {phase === "found" && (
            <div className="text-center space-y-4 py-2">
              <CheckCircle2 className="h-12 w-12 text-teal-600 mx-auto" />
              <div>
                <p className="font-semibold text-lg leading-snug">{foundTitle}</p>
                <p className="text-sm text-muted-foreground mt-0.5">ISBN: {scannedIsbn}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleScanAgain}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Scan Again
                </Button>
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={handleViewBook}>
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" /> View Book
                </Button>
              </div>
            </div>
          )}

          {phase === "notfound" && (
            <div className="text-center space-y-4 py-2">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
              <div>
                <p className="font-semibold">Book not found</p>
                <p className="text-sm text-muted-foreground mt-0.5">ISBN: {scannedIsbn}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This ISBN isn't in the library yet. You can add it via "Add Book".
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleScanAgain}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Scan Again
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="text-center space-y-4 py-2">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" className="w-full" onClick={handleClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
