// src/App.js
import React, { useState, useEffect, useRef } from "react";
import { Camera, Sun, Film, Plus, Trash2, Edit2, Save, Video, VideoOff } from "lucide-react";
import "./App.css";

function App() {
  // ---- State hooks ----
  const [activeTab, setActiveTab] = useState('meter');
  const [iso, setIso] = useState(400);
  const [aperture, setAperture] = useState(5.6);
  const [shutterSpeed, setShutterSpeed] = useState('1/125');
  const [ev, setEv] = useState(13);
  const [measuredEV, setMeasuredEV] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [logs, setLogs] = useState([]);
  const [editingLog, setEditingLog] = useState(null);
  const [newLog, setNewLog] = useState({
    camera: '',
    lens: '',
    film: '',
    iso: 400,
    aperture: 5.6,
    shutter: '1/125',
    notes: '',
    location: ''
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const measureIntervalRef = useRef(null);

  const isoValues = [25,50,100,200,400,800,1600,3200,6400];
  const apertureValues = [1.4,2,2.8,4,5.6,8,11,16,22];
  const shutterSpeeds = ['1/8000','1/4000','1/2000','1/1000','1/500','1/250','1/125','1/60','1/30','1/15','1/8','1/4','1/2','1','2','4','8'];

  // ---- Effects ----
  useEffect(() => {
    loadLogs();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    const newShutter = calculateShutterFromEV(ev, aperture, iso);
    setShutterSpeed(newShutter);
  }, [ev, aperture, iso]);

  // ---- Functions ----
  const loadLogs = () => {
    try {
      const saved = localStorage.getItem('film-logs');
      if(saved) setLogs(JSON.parse(saved));
    } catch {}
  };

  const saveLogs = (updatedLogs) => {
    try {
      localStorage.setItem('film-logs', JSON.stringify(updatedLogs));
      setLogs(updatedLogs);
    } catch (e) { console.error(e) }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if(videoRef.current){
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        measureIntervalRef.current = setInterval(measureLight, 500);
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Please allow camera access to use the light meter');
    }
  };

  const stopCamera = () => {
    if(streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop());
    if(measureIntervalRef.current) clearInterval(measureIntervalRef.current);
    setCameraActive(false);
  };

  const measureLight = () => {
    if(!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    const data = imageData.data;
    let totalBrightness = 0;
    const sampleSize = data.length/4;
    for(let i=0;i<data.length;i+=4){
      const r=data[i], g=data[i+1], b=data[i+2];
      totalBrightness += (0.299*r + 0.587*g + 0.114*b)/255;
    }
    const averageBrightness = totalBrightness/sampleSize;
    const calculatedEV = Math.log2(averageBrightness*100)+5;
    const clampedEV = Math.max(0, Math.min(20, calculatedEV));
    setMeasuredEV(clampedEV);
    setEv(clampedEV);
  };

  const calculateShutterFromEV = (targetEV, aperture, iso) => {
    const shutterValue = (aperture*aperture)/Math.pow(2,targetEV - Math.log2(iso/100));
    for(let speed of shutterSpeeds){
      const val = speed.includes('/') ? 1/parseInt(speed.split('/')[1]) : parseInt(speed);
      if(Math.abs(val-shutterValue)/shutterValue < 0.3) return speed;
    }
    return shutterSpeeds[6];
  };

  const addLog = () => {
    const log = {...newLog,id:Date.now(),timestamp:new Date().toISOString(),ev:measuredEV||ev};
    const updatedLogs=[log,...logs];
    saveLogs(updatedLogs);
    setNewLog({camera:'',lens:'',film:'',iso:400,aperture:5.6,shutter:'1/125',notes:'',location:''});
    setActiveTab('logs');
  };

  const deleteLog = (id) => saveLogs(logs.filter(l=>l.id!==id));
  const startEdit = (log)=>setEditingLog(log);
  const saveEdit = ()=>{ saveLogs(logs.map(l=>l.id===editingLog.id?editingLog:l)); setEditingLog(null); };

  // ---- JSX ----
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-md mx-auto pb-20">
        <header className="bg-gray-800 p-4 shadow-lg">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="w-7 h-7" /> Film Meter Pro
          </h1>
        </header>

        <div className="p-4">
          {activeTab === 'meter' && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
                <div className="flex items-center justify-center mb-4">
                  {cameraActive ? (
                    <div className="relative w-full">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 border-4 border-blue-400 rounded-lg pointer-events-none"></div>
                    </div>
                  ) : (
                    <Sun className="w-12 h-12 text-yellow-400" />
                  )}
                </div>
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold mb-2">
                    {measuredEV !== null ? measuredEV.toFixed(1) : ev.toFixed(1)}
                  </div>
                  <div className="text-gray-400">
                    {measuredEV !== null ? 'Measured EV' : 'EV (Exposure Value)'}
                  </div>
                </div>
                <button
                  onClick={cameraActive ? stopCamera : startCamera}
                  className={`w-full mb-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                    cameraActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {cameraActive ? <><VideoOff className="w-5 h-5" /> Stop Measuring</> : <><Video className="w-5 h-5" /> Measure Light</>}
                </button>
                {/* Controls for ISO, Aperture, Shutter, EV */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">ISO</label>
                    <select value={iso} onChange={(e)=>setIso(Number(e.target.value))} className="w-full bg-gray-700 rounded px-4 py-2 text-lg">
                      {isoValues.map(v=><option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Aperture (f/)</label>
                    <select value={aperture} onChange={(e)=>setAperture(Number(e.target.value))} className="w-full bg-gray-700 rounded px-4 py-2 text-lg">
                      {apertureValues.map(v=><option key={v} value={v}>f/{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Shutter Speed</label>
                    <div className="w-full bg-gray-700 rounded px-4 py-2 text-lg text-center font-mono">{shutterSpeed}s</div>
                  </div>
                  {!cameraActive && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Manual EV Adjust</label>
                      <input type="range" min="0" max="20" step="0.5" value={ev} onChange={(e)=>setEv(Number(e.target.value))} className="w-full"/>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={()=>{setNewLog({...newLog, iso, aperture, shutter:shutterSpeed}); setActiveTab('add');}}
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Log This Shot
              </button>
            </div>
          )}

          {/* Add tab */}
          {activeTab === 'add' && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-4">
              <h2 className="text-xl font-bold mb-4">New Film Log Entry</h2>
              <input placeholder="Camera" value={newLog.camera} onChange={(e)=>setNewLog({...newLog, camera:e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2"/>
              <input placeholder="Lens" value={newLog.lens} onChange={(e)=>setNewLog({...newLog, lens:e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2"/>
              <input placeholder="Film Stock" value={newLog.film} onChange={(e)=>setNewLog({...newLog, film:e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2"/>
              <input placeholder="Location" value={newLog.location} onChange={(e)=>setNewLog({...newLog, location:e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2"/>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-400">ISO</label>
                  <select value={newLog.iso} onChange={(e)=>setNewLog({...newLog, iso:Number(e.target.value)})} className="w-full bg-gray-700 rounded px-2 py-1 text-sm">
                    {isoValues.map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Aperture</label>
                  <select value={newLog.aperture} onChange={(e)=>setNewLog({...newLog, aperture:Number(e.target.value)})} className="w-full bg-gray-700 rounded px-2 py-1 text-sm">
                    {apertureValues.map(v=><option key={v} value={v}>f/{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Shutter</label>
                  <select value={newLog.shutter} onChange={(e)=>setNewLog({...newLog, shutter:e.target.value})} className="w-full bg-gray-700 rounded px-2 py-1 text-sm">
                    {shutterSpeeds.map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <textarea placeholder="Notes" value={newLog.notes} onChange={(e)=>setNewLog({...newLog, notes:e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 h-24"/>
              <button onClick={addLog} className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold">Save Log Entry</button>
            </div>
          )}

          {/* Logs tab */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Film Logs ({logs.length})</h2>
              {logs.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No logs yet. Start shooting!</p>
                </div>
              ) : logs.map(log => (
                <div key={log.id} className="bg-gray-800 rounded-lg p-4">
                  {editingLog?.id === log.id ? (
                    <div className="space-y-3">
                      <input value={editingLog.camera} onChange={(e)=>setEditingLog({...editingLog, camera:e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm" placeholder="Camera"/>
                      <input value={editingLog.lens} onChange={(e)=>setEditingLog({...editingLog, lens:e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm" placeholder="Lens"/>
                      <input value={editingLog.film} onChange={(e)=>setEditingLog({...editingLog, film:e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm" placeholder="Film"/>
                      <textarea value={editingLog.notes} onChange={(e)=>setEditingLog({...editingLog, notes:e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm h-20" placeholder="Notes"/>
                      <button onClick={saveEdit} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded flex items-center justify-center gap-2"><Save className="w-4 h-4"/>Save</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-lg">{log.camera || 'Camera'}</div>
                          <div className="text-sm text-gray-400">{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={()=>startEdit(log)} className="text-blue-400 hover:text-blue-300"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={()=>deleteLog(log.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        {log.lens && <div><span className="text-gray-400">Lens:</span> {log.lens}</div>}
                        {log.film && <div><span className="text-gray-400">Film:</span> {log.film}</div>}
                        {log.location && <div><span className="text-gray-400">Location:</span> {log.location}</div>}
                        <div className="flex gap-4 mt-2 text-sm flex-wrap">
                          <span className="bg-gray-700 px-2 py-1 rounded">ISO {log.iso}</span>
                          <span className="bg-gray-700 px-2 py-1 rounded">f/{log.aperture}</span>
                          <span className="bg-gray-700 px-2 py-1 rounded">{log.shutter}s</span>
                          <span className="bg-gray-700 px-2 py-1 rounded">EV {log.ev?.toFixed(1)}</span>
                        </div>
                        {log.notes && <div className="mt-2 text-gray-300 italic">{log.notes}</div>}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
          <div className="max-w-md mx-auto flex">
            <button onClick={()=>setActiveTab('meter')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab==='meter'?'text-blue-400':'text-gray-400'}`}><Sun className="w-6 h-6"/><span className="text-xs">Meter</span></button>
            <button onClick={()=>setActiveTab('add')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab==='add'?'text-blue-400':'text-gray-400'}`}><Plus className="w-6 h-6"/><span className="text-xs">Add</span></button>
            <button onClick={()=>setActiveTab('logs')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab==='logs'?'text-blue-400':'text-gray-400'}`}><Film className="w-6 h-6"/><span className="text-xs">Logs</span></button>
          </div>
        </nav>
      </div>
    </div>
  );
}

export default App;
