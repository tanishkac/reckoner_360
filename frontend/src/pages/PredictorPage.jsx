import React, { useState } from 'react';
import { Search, Info, Landmark, Home } from 'lucide-react';

const PredictorPage = () => {
  const [formData, setFormData] = useState({
    region_id: 8, // Default to Andheri West
    area: 65,
    uc: false,
    resale: false,
    floor: 1,
    bhk: 2
  });
  const [result, setResult] = useState(null);

  const handlePredict = async () => {
    const params = new URLSearchParams(formData).toString();
    const response = await fetch(`http://127.0.0.1:8000/predict_rrr?${params}`);
    const data = await response.json();
    setResult(data);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* INPUT PANEL */}
      <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 space-y-6">
        <h3 className="text-lg font-bold">Property Parameters</h3>
        
        <div>
          <label className="text-xs font-black text-slate-500 uppercase tracking-tighter">Target Region</label>
          <select 
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 mt-1"
            onChange={(e) => setFormData({...formData, region_id: parseInt(e.target.value)})}
          >
            <option value="8">Andheri West</option>
            <option value="29">Borivali West</option>
            <option value="114">Naigaon East</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase">Area (sqm)</label>
            <input type="number" value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase">BHK</label>
            <input type="number" value={formData.bhk} onChange={(e) => setFormData({...formData, bhk: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3" />
          </div>
        </div>

        <button onClick={handlePredict} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20">
          Run Prediction
        </button>
      </div>

      {/* RESULTS PANEL */}
      <div className="lg:col-span-2 space-y-6">
        {result ? (
          <div className="animate-in fade-in slide-in-from-right-4">
             <div className="bg-slate-800 p-10 rounded-3xl border-l-8 border-blue-500 shadow-2xl">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Fair Market RRR</p>
                <h2 className="text-7xl font-black mt-2">₹{result.predicted_rrr.toLocaleString()}</h2>
                <p className="text-emerald-500 font-bold mt-4 flex items-center gap-2">
                   Confidence Range: ₹{result.low_bound.toLocaleString()} — ₹{result.high_bound.toLocaleString()}
                </p>
             </div>
          </div>
        ) : (
          <div className="h-full border-2 border-dashed border-slate-800 rounded-3xl flex items-center justify-center text-slate-600 font-medium">
            Awaiting parameters for valuation...
          </div>
        )}
      </div>
    </div>
  );
};