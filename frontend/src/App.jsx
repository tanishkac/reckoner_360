import React, { useState, useEffect } from 'react';
import { 
  Search, Zap, Map, LayoutDashboard, Info, Building2, 
  Layers, AlertCircle, TrendingUp, Users, DollarSign, Brain 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import regionsData from './regions.json'; 
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";

// --- SUB-COMPONENT: STAT CARD ---
const StatCard = ({ title, value, subText, icon, trend, isNegative }) => (
  <div className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700 relative overflow-hidden group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-900 rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
      {trend !== undefined && (
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{title}</h3>
    <p className="text-2xl font-black text-white mt-1 italic">{value}</p>
    <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase">{subText}</p>
  </div>
);

// --- PAGE: RRR PREDICTOR (STAYS AS IS) ---
const PredictorPage = () => {
  const [formData, setFormData] = useState({
    region_id: regionsData[0]?.region_encoded || 8,
    area: 65,
    bhk: 2,
    floor: 5,
    uc: false,
    resale: false
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(formData).toString();
      const response = await fetch(`http://127.0.0.1:8000/predict_rrr?${params}`);
      if (!response.ok) throw new Error("Backend connection failed");
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError("Is your FastAPI backend running? Check port 8000.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white italic tracking-tight uppercase">RRR Predictor</h1>
        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Validated Policy Engine • ±10.7% Error Margin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 backdrop-blur-sm h-fit shadow-2xl">
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Target Region</label>
              <select 
                value={formData.region_id}
                onChange={(e) => setFormData({...formData, region_id: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                {regionsData.map((reg) => (
                  <option key={reg.region_encoded} value={reg.region_encoded}>{reg.region}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Area (sqm)</label>
                <input type="number" value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">BHK</label>
                <input type="number" value={formData.bhk} onChange={(e) => setFormData({...formData, bhk: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Floor Level</label>
              <input type="number" value={formData.floor} onChange={(e) => setFormData({...formData, floor: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
            </div>
            <div className="flex gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={formData.uc} onChange={(e) => setFormData({...formData, uc: e.target.checked})} className="w-4 h-4 accent-blue-500" />
                <span className="text-[10px] text-slate-400 font-black group-hover:text-white transition-colors uppercase">UC</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={formData.resale} onChange={(e) => setFormData({...formData, resale: e.target.checked})} className="w-4 h-4 accent-blue-500" />
                <span className="text-[10px] text-slate-400 font-black group-hover:text-white transition-colors uppercase">Resale</span>
              </label>
            </div>
            <button onClick={handlePredict} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white py-4 rounded-2xl font-black transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
              {loading ? "PROCESSING..." : <><Search size={18} /> PREDICT RATE</>}
            </button>
            {error && <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase mt-2"><AlertCircle size={14} /> {error}</div>}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
              <div className="bg-slate-800 p-10 rounded-[2.5rem] border-l-[12px] border-blue-500 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Building2 size={160} /></div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Estimated Fair Market RRR/sqm</p>
                <h2 className="text-8xl font-black text-white mt-2 italic tracking-tighter">₹{result.predicted_rrr?.toLocaleString()}</h2>
                <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Model Accuracy 89.3%</span>
                </div>
              </div>
              <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 shadow-xl">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><Layers size={18} className="text-blue-500" /> Valuation Breakdown</h3>
                 <div className="space-y-10">
                   {result.breakdown?.map((item, i) => (
                     <div key={i}>
                        <div className="flex justify-between text-[11px] font-black uppercase tracking-tighter mb-3">
                          <span className="text-slate-400">{item.label}</span>
                          <span className="text-white font-mono text-sm">₹{item.value.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-700/50">
                          <div className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000" style={{ width: `${(item.value / result.predicted_rrr) * 100}%` }}></div>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center p-20 text-slate-700 text-center">
              <LayoutDashboard size={80} className="mb-6 opacity-10" /><p className="font-black text-xs uppercase tracking-[0.3em] opacity-30 max-w-xs leading-loose">System Initialized.<br/>Please provide property parameters to start the ML engine.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- PAGE: SIMULATION ENGINE (UPGRADED) ---
const SimulationPage = () => {
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('Andheri West');
  const [hike, setHike] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/regions')
      .then(res => res.json())
      .then(data => {
        setRegions(data.regions);
        if (data.regions.length > 0) setSelectedRegion(data.regions[0]);
      });
  }, []);

  useEffect(() => {
    const fetchSim = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/simulate/${selectedRegion}?hike=${hike}`);
        const resData = await response.json();
        setData(resData);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchSim();
  }, [selectedRegion, hike]);

  const handleOptimize = async () => {
    const res = await fetch(`http://127.0.0.1:8000/optimize/${selectedRegion}`);
    const opt = await res.json();
    setHike(opt.optimal_hike); 
  };

  if (!data) return <div className="p-20 text-slate-500 font-black uppercase tracking-[0.4em] animate-pulse">Syncing Decision Engine...</div>;

  return (
    <div className="animate-in fade-in duration-700">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tight uppercase">Decision Suite</h1>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Revenue Optimization & Stress Testing</p>
        </div>
        <button 
          onClick={handleOptimize}
          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95"
        >
          <Brain size={20} fill="white" /> AI Recommendation
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="bg-slate-800/50 p-6 rounded-[2.5rem] border border-slate-700 h-fit space-y-8 backdrop-blur-md">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Target Geography</label>
            <select 
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <div className="flex justify-between mb-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Proposed Hike</label>
              <span className={`font-black italic ${hike >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{hike}%</span>
            </div>
            <input 
              type="range" min="-10" max="30" step="0.5"
              value={hike}
              onChange={(e) => setHike(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[9px] font-black text-slate-600 mt-4 uppercase tracking-tighter">
              <span>Tax Cut</span>
              <span>Neutral</span>
              <span>Aggressive</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Projected Revenue" 
              value={`₹${data.simulated_rev_cr} Cr`} 
              subText={`Baseline: ₹${data.baseline_rev_cr} Cr`}
              icon={<DollarSign className="text-emerald-400" size={20} />}
              trend={data.revenue_change_pct}
            />
            <StatCard 
              title="Transaction Volume" 
              value={`-${data.volume_loss_pct}%`} 
              subText="Expected Market Cooling"
              icon={<Users className="text-orange-400" size={20} />}
              trend={-data.volume_loss_pct}
            />
            <StatCard 
              title="Policy Health" 
              value={data.status} 
              subText="Risk Assessment"
              icon={<TrendingUp className={data.status === 'STABLE' ? 'text-blue-400' : 'text-red-400'} size={20} />}
            />
          </div>

          <div className="bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-700 h-96 shadow-2xl relative overflow-hidden">
             <div className="mb-6"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue Sensitivity Curve (Laffer Analysis)</h4></div>
             <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={data.curve || []}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="hike" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}%`} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={4} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- NAVIGATION COMPONENT ---
const NavItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-300 group ${
      active 
        ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/40 translate-x-2' 
        : 'text-slate-500 hover:bg-slate-700/40 hover:text-slate-300'
    }`}
  >
    <span className={`${active ? 'text-white' : 'group-hover:text-blue-400'} transition-colors`}>{icon}</span>
    <span className="font-black text-[10px] uppercase tracking-[0.2em]">{label}</span>
  </button>
);

const HeatmapPage = () => {
  const [data, setData] = useState([]);
  const [hoveredRegion, setHoveredRegion] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/heatmap_data')
      .then(res => res.json())
      .then(json => setData(json));
  }, []);

  // --- 1. THE TRANSLATION DICTIONARY ---
  // This bridges the gap between GeoJSON "Codes" and CSV "Names"
  const wardToRegionMap = {
    "A": "Cuffe Parade",
    "B": "Masjid Bunder",
    "C": "Marine Lines",
    "D": "Malabar Hill",
    "E": "Byculla",
    "H/E": "Santacruz East",
    "H/W": "Bandra West",
    "K/E": "Andheri East",
    "K/W": "Andheri West",
    "P/S": "Goregaon",
    "P/N": "Malad",
    "R/S": "Kandivali",
    "R/C": "Borivali",
    "R/N": "Dahisar",
    "L": "Kurla",
    "M/E": "Govandi",
    "M/W": "Chembur",
    "N": "Ghatkopar",
    "S": "Powai",
    "T": "Mulund",
    "F/N": "Matunga",
    "F/S": "Parel",
    "G/N": "Dadar",
    "G/S": "Worli"
  };

  // COLOR SCALE: Blue (Safe/Optimized) -> Red (High Revenue Leakage)
  const colorScale = scaleLinear()
    .domain([0, 15, 30])
    .range(["#3b82f6", "#f59e0b", "#ef4444"]);

  return (
    <div className="animate-in fade-in duration-1000">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Mumbai Revenue Leakage</h1>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em]">Geospatial ML Analysis • Policy Engine Alpha</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        
        {/* THE MAP CARD */}
        <div className="lg:col-span-3 bg-slate-800/20 rounded-[3rem] border border-slate-800 p-6 relative overflow-hidden flex items-center justify-center">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              center: [72.8777, 19.0760], 
              scale: 55000 
            }}
            className="w-full h-[650px]"
          >
            <Geographies geography="/mumbai_wards.json">
              {({ geographies }) =>
                geographies.map((geo) => {
                  // --- 2. MATCHING LOGIC ---
                  const wardCode = geo.properties.name || geo.properties.ward_name;
                  
                  // Translate the code (e.g., "R/S") to CSV name (e.g., "Kandivali")
                  const csvRegionName = wardToRegionMap[wardCode] || wardCode;

                  // Find the data from the API response
                  const regionData = data.find(d => d.region.toLowerCase() === csvRegionName.toLowerCase());

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setHoveredRegion(regionData || { region: csvRegionName, leakage_score: 0 })}
                      onMouseLeave={() => setHoveredRegion(null)}
                      style={{
                        default: {
                          // Apply heat color if data exists, otherwise default dark slate
                          fill: regionData ? colorScale(regionData.leakage_score) : "#1e293b",
                          stroke: "#0f172a",
                          strokeWidth: 0.5,
                          outline: "none"
                        },
                        hover: {
                          fill: "#fff",
                          stroke: "#3b82f6",
                          strokeWidth: 2,
                          cursor: "pointer",
                          outline: "none"
                        }
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>

          {/* FLOATING DATA OVERLAY */}
          {hoveredRegion && (
            <div className="absolute top-10 right-10 bg-slate-900/80 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-700 shadow-2xl animate-in zoom-in-95">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{hoveredRegion.region}</p>
              <h2 className="text-4xl font-black text-white italic">+{hoveredRegion.leakage_score}%</h2>
              <p className="text-[9px] font-bold text-red-500 uppercase mt-2">Revenue Potential Unlocked</p>
            </div>
          )}
        </div>

        {/* SIDEBAR: LEADERBOARD */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Priority Zones</h3>
          <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
            {data.map((item, idx) => (
              <div key={idx} className="bg-slate-800/40 p-5 rounded-3xl border border-slate-800 flex justify-between items-center group hover:border-blue-500/30 transition-all">
                <div>
                  <span className="text-[9px] font-black text-slate-600 block">RANK {idx + 1}</span>
                  <span className="text-white font-black italic uppercase text-sm">{item.region}</span>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-black ${item.leakage_score > 15 ? 'text-red-500' : 'text-blue-500'}`}>
                    {item.leakage_score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [activePage, setActivePage] = useState('predictor');

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 selection:bg-blue-500/30 font-sans antialiased">
      <nav className="w-80 bg-slate-800 border-r border-slate-700 p-8 flex flex-col shadow-2xl z-10">
        <div className="flex items-center gap-3 text-blue-500 font-black text-3xl mb-16 italic tracking-tighter select-none">
          <Zap size={36} fill="currentColor" />
          <span>RECKONER<span className="text-white">360</span></span>
        </div>
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-6 px-4">Core Modules</p>
          <NavItem icon={<Search size={20} />} label="Predictor" active={activePage === 'predictor'} onClick={() => setActivePage('predictor')} />
          <NavItem icon={<Zap size={20} />} label="Simulator" active={activePage === 'simulation'} onClick={() => setActivePage('simulation')} />
          <NavItem icon={<Map size={20} />} label="Heatmaps" active={activePage === 'heatmaps'} onClick={() => setActivePage('heatmaps')} />
        </div>
        <div className="mt-auto p-6 bg-slate-900 rounded-[2rem] border border-slate-700/50 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.7)]"></div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">ML Node Online</p>
          </div>
          <p className="text-[9px] text-slate-600 mt-2 font-bold">V.4.0 • GEN-ENGINE-ALPHA</p>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto bg-slate-900 p-12">
        <div className="max-w-7xl mx-auto">
          {activePage === 'predictor' && <PredictorPage />}
          {activePage === 'simulation' && <SimulationPage />}
          {activePage === 'heatmaps' && <HeatmapPage />}
        </div>
      </main>
    </div>
  );
}