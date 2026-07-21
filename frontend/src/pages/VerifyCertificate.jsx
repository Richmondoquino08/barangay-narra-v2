import React, { useState, useRef, useCallback, useEffect } from 'react';
import { certificatesAPI } from '../api/apiClient';
import { useToast } from '../components/Toast';
import { ShieldCheck, Search, Camera, X, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const STATUS_LABELS = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected', issued: 'Issued',
};

export default function VerifyCertificate() {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { found, deleted, message, certificate }
  const [scanning, setScanning] = useState(false);
  const [scanSupported, setScanSupported] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    setScanSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window);
  }, []);

  const stopScan = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => () => stopScan(), [stopScan]);

  async function runVerify(rawCode) {
    const trimmed = (rawCode || '').trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await certificatesAPI.verify(trimmed);
      setResult(res.data);
    } catch (err) {
      toast(err.response?.data?.message || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    runVerify(code);
  }

  async function startScan() {
    try {
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      tick();
    } catch {
      toast('Camera access failed or was denied', 'error');
      stopScan();
    }
  }

  function tick() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    detectorRef.current.detect(video).then(codes => {
      if (codes.length > 0) {
        const value = codes[0].rawValue;
        stopScan();
        setCode(value);
        runVerify(value);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    }).catch(() => {
      rafRef.current = requestAnimationFrame(tick);
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck size={22} className="text-indigo-600"/> Verify Certificate
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Enter the code printed under a certificate's QR, or scan the QR directly, to confirm it was actually issued by this office.
          </p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. CERT-A1B2C3D4E5F6A7B8 or certificate ID"
            className="input-field flex-1"
            autoFocus
          />
          <button type="submit" disabled={loading || !code.trim()} className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
            <Search size={15}/> {loading ? 'Checking…' : 'Verify'}
          </button>
        </form>

        {scanSupported && (
          <div>
            {!scanning ? (
              <button onClick={startScan} className="act-btn act-sky">
                <Camera size={13}/> Scan QR with camera
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black max-w-sm">
                <video ref={videoRef} className="w-full aspect-square object-cover" muted playsInline/>
                <button onClick={stopScan} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80">
                  <X size={16}/>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {result && (
        <div className="card p-5">
          {result.found ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 size={20}/> Genuine — this certificate was issued by this office
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-gray-500 dark:text-slate-400">Certificate #</dt>
                <dd className="text-gray-900 dark:text-slate-100 font-medium">{result.certificate.id}</dd>
                <dt className="text-gray-500 dark:text-slate-400">Type</dt>
                <dd className="text-gray-900 dark:text-slate-100 font-medium capitalize">{(result.certificate.certificate_type || '').replace(/_/g, ' ')}</dd>
                <dt className="text-gray-500 dark:text-slate-400">Resident</dt>
                <dd className="text-gray-900 dark:text-slate-100 font-medium">{result.certificate.resident_name}</dd>
                <dt className="text-gray-500 dark:text-slate-400">Purpose</dt>
                <dd className="text-gray-900 dark:text-slate-100 font-medium">{result.certificate.purpose || '—'}</dd>
                <dt className="text-gray-500 dark:text-slate-400">Issue date</dt>
                <dd className="text-gray-900 dark:text-slate-100 font-medium">
                  {result.certificate.issue_date ? new Date(result.certificate.issue_date).toLocaleDateString('en-PH') : '—'}
                </dd>
                <dt className="text-gray-500 dark:text-slate-400">Status</dt>
                <dd className="text-gray-900 dark:text-slate-100 font-medium">{STATUS_LABELS[result.certificate.status] || result.certificate.status}</dd>
                {result.certificate.or_number && (<>
                  <dt className="text-gray-500 dark:text-slate-400">OR Number</dt>
                  <dd className="text-gray-900 dark:text-slate-100 font-medium">{result.certificate.or_number}</dd>
                </>)}
              </dl>
            </div>
          ) : result.deleted ? (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={20} className="shrink-0"/>
              <div>
                <p className="font-semibold">This certificate was deleted</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{result.message}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
              <XCircle size={20}/> No matching certificate — this code could not be verified
            </div>
          )}
        </div>
      )}
    </div>
  );
}
