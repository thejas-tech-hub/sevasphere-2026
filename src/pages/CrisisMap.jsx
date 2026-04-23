import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import Navbar from '../components/Navbar';
import { detectCrises } from '../utils/gemini';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader, Zap, AlertTriangle, Users, MapPin, RefreshCw } from 'lucide-react';

const MAP_CONTAINER = { width: '100%', height: '500px' };
const INDIA_CENTER = { lat: 22.5, lng: 82.0 };
const MAP_OPTIONS = {
  zoom: 5,
  mapTypeId: 'roadmap',
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3e50' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6584' }] },
  ],
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

const URGENCY_CONFIG = {
  critical: { color: '#ef4444', fillColor: '#ef4444', radius: 120000, zIndex: 3 },
  high:     { color: '#f97316', fillColor: '#f97316', radius: 90000,  zIndex: 2 },
  medium:   { color: '#eab308', fillColor: '#eab308', radius: 60000,  zIndex: 1 },
};

const TYPE_EMOJI = {
  flood:'🌊', heatwave:'🌡️', cyclone:'🌀', food:'🍚',
  health:'🏥', fire:'🔥', earthquake:'🏔️', drought:'🏜️', volcano:'🌋'
};

const CUSTOM_MARKER = (urgency) => ({
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  fillColor: URGENCY_CONFIG[urgency]?.color || '#6b7280',
  fillOpacity: 1,
  strokeWeight: 2,
  strokeColor: '#ffffff',
  scale: urgency === 'critical' ? 2.2 : urgency === 'high' ? 1.9 : 1.6,
  anchor: { x: 12, y: 24 },
});

export default function CrisisMap() {
  const [crises, setCrises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState('');

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_MAPS_API_KEY,
    libraries: ['visualization'],
  });

  useEffect(() => { loadCrises(); }, []);

  async function loadCrises() {
    setLoading(true);
    const data = await detectCrises();
    setCrises(data);
    if (data?.length > 0) {
      const hasLive = data.some(c => c.source === 'GDACS');
      setDataSource(hasLive ? 'gdacs' : 'gemini');
    }
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setSelected(null);
    const data = await detectCrises();
    setCrises(data);
    if (data?.length > 0) {
      const hasLive = data.some(c => c.source === 'GDACS');
      setDataSource(hasLive ? 'gdacs' : 'gemini');
    }
    setRefreshing(false);
  }

  const onMapLoad = useCallback((map) => { setMapRef(map); }, []);

  const flyTo = (crisis) => {
    setSelected(crisis);
    if (mapRef) {
      mapRef.panTo({ lat: crisis.lat, lng: crisis.lng });
      mapRef.setZoom(8);
    }
  };

  const totalAffected = crises.reduce((a, c) => a + (c.affectedPeople || 0), 0);
  const totalDeployed = crises.reduce((a, c) => a + (c.volunteersDeployed || 0), 0);
  const totalNeeded   = crises.reduce((a, c) => a + (c.volunteersNeeded || 0), 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <Zap className="w-6 h-6 text-orange-400" />
              <h1 className="text-2xl font-bold">Crisis Intelligence Map</h1>
              <span className="text-xs bg-green-500 px-2 py-0.5 rounded-full animate-pulse font-semibold">LIVE</span>
              {dataSource === 'gdacs' && (
                <span className="text-xs bg-green-900/60 border border-green-600 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                  🌍 Live UN/GDACS Data
                </span>
              )}
              {dataSource === 'gemini' && (
                <span className="text-xs bg-purple-900/60 border border-purple-600 text-purple-400 px-2 py-0.5 rounded-full font-semibold">
                  🤖 Gemini AI Intelligence
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              Gemini AI · Real-time crisis detection across India · {new Date().toLocaleTimeString()}
            </p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg transition text-sm font-medium disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh AI Data'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { value: crises.length, label: 'Active Crises', color: 'text-red-400', icon: <AlertTriangle className="w-5 h-5 text-red-400"/> },
            { value: totalAffected.toLocaleString(), label: 'People Affected', color: 'text-orange-400', icon: <Users className="w-5 h-5 text-orange-400"/> },
            { value: `${totalDeployed}/${totalNeeded}`, label: 'Volunteers Deployed', color: 'text-green-400', icon: <Users className="w-5 h-5 text-green-400"/> },
            { value: crises.filter(c => c.urgency === 'critical').length, label: 'Critical Alerts', color: 'text-red-500', icon: <Zap className="w-5 h-5 text-red-500"/> },
          ].map((s, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center gap-3">
              {s.icon}
              <div>
                <div className={`text-xl font-extrabold ${s.color}`}>{s.value}</div>
                <div className="text-gray-400 text-xs mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-gray-800 rounded-2xl border border-gray-700">
            <Loader className="w-10 h-10 animate-spin text-orange-400 mb-4" />
            <p className="text-gray-400 font-medium">Gemini AI scanning crisis intelligence feeds...</p>
            <p className="text-gray-600 text-sm mt-1">Analyzing weather patterns, disaster alerts, and risk data</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Map */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-700 flex-wrap">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Legend</span>
                  {[['critical','#ef4444'],['high','#f97316'],['medium','#eab308']].map(([u,c]) => (
                    <div key={u} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor:c}}/>
                      <span className="text-xs text-gray-300 capitalize">{u}</span>
                    </div>
                  ))}
                  <span className="text-xs text-gray-500 ml-auto">Click a pin for details</span>
                </div>

                {loadError ? (
                  <div className="flex items-center justify-center h-96 text-gray-400">
                    <p>Maps failed to load. Check your API key.</p>
                  </div>
                ) : !isLoaded ? (
                  <div className="flex items-center justify-center h-96">
                    <Loader className="w-8 h-8 animate-spin text-orange-400"/>
                  </div>
                ) : (
                  <GoogleMap
                    mapContainerStyle={MAP_CONTAINER}
                    center={INDIA_CENTER}
                    options={MAP_OPTIONS}
                    onLoad={onMapLoad}
                    onClick={() => setSelected(null)}
                  >
                    {crises.map(crisis => (
                      <React.Fragment key={crisis.id}>
                        <Circle
                          center={{ lat: crisis.lat, lng: crisis.lng }}
                          radius={URGENCY_CONFIG[crisis.urgency]?.radius || 80000}
                          options={{
                            fillColor: URGENCY_CONFIG[crisis.urgency]?.fillColor || '#6b7280',
                            fillOpacity: 0.15,
                            strokeColor: URGENCY_CONFIG[crisis.urgency]?.color || '#6b7280',
                            strokeOpacity: 0.4,
                            strokeWeight: 2,
                            zIndex: URGENCY_CONFIG[crisis.urgency]?.zIndex || 1,
                          }}
                        />
                        <Marker
                          position={{ lat: crisis.lat, lng: crisis.lng }}
                          icon={CUSTOM_MARKER(crisis.urgency)}
                          title={crisis.title}
                          zIndex={URGENCY_CONFIG[crisis.urgency]?.zIndex || 1}
                          onClick={() => flyTo(crisis)}
                        />
                        {selected?.id === crisis.id && (
                          <InfoWindow
                            position={{ lat: crisis.lat, lng: crisis.lng }}
                            onCloseClick={() => setSelected(null)}
                          >
                            <div style={{ maxWidth: '260px', fontFamily: 'sans-serif' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                                <span style={{ fontSize:'20px' }}>{TYPE_EMOJI[crisis.type] || '⚠️'}</span>
                                <strong style={{ fontSize:'14px', color:'#1e3a8a' }}>{crisis.title}</strong>
                              </div>
                              <div style={{ fontSize:'12px', color:'#6b7280', marginBottom:'6px' }}>📍 {crisis.location}</div>
                              <p style={{ fontSize:'12px', color:'#374151', marginBottom:'10px', lineHeight:'1.5' }}>{crisis.description}</p>
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px', marginBottom:'8px' }}>
                                {[
                                  ['Risk', `${crisis.riskScore}/100`],
                                  ['Affected', crisis.affectedPeople?.toLocaleString()],
                                  ['Volunteers', `${crisis.volunteersDeployed}/${crisis.volunteersNeeded}`],
                                ].map(([l,v]) => (
                                  <div key={l} style={{ textAlign:'center', background:'#f3f4f6', borderRadius:'6px', padding:'6px' }}>
                                    <div style={{ fontSize:'13px', fontWeight:'700', color:'#1e3a8a' }}>{v}</div>
                                    <div style={{ fontSize:'10px', color:'#9ca3af' }}>{l}</div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', marginBottom:'8px' }}>
                                {crisis.skills?.slice(0,3).map(s => (
                                  <span key={s} style={{ fontSize:'10px', background:'#dbeafe', color:'#1e40af', padding:'2px 8px', borderRadius:'20px' }}>{s}</span>
                                ))}
                              </div>
                              {crisis.source && (
                                <div style={{ fontSize:'10px', padding:'3px 8px', borderRadius:'20px', display:'inline-block',
                                  background: crisis.source === 'GDACS' ? '#dcfce7' : '#f3e8ff',
                                  color: crisis.source === 'GDACS' ? '#166534' : '#6b21a8' }}>
                                  {crisis.source === 'GDACS' ? '🌍 Live GDACS Data' : '🤖 Gemini AI'}
                                </div>
                              )}
                            </div>
                          </InfoWindow>
                        )}
                      </React.Fragment>
                    ))}
                  </GoogleMap>
                )}
              </div>

              {/* Risk Chart */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Risk Score by State</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={crises.map(c => ({
                    name: c.state || c.location.split(',')[1]?.trim() || c.location,
                    risk: c.riskScore
                  }))}>
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
                    <Bar dataKey="risk" radius={[4, 4, 0, 0]}>
                      {crises.map((c, i) => (
                        <Cell key={i} fill={c.riskScore >= 80 ? '#ef4444' : c.riskScore >= 60 ? '#f97316' : '#eab308'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-3 lg:overflow-y-auto lg:max-h-[700px] pr-1">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-900 py-2">
                Active Alerts — click to locate
              </h2>
              {crises.map(c => (
                <div key={c.id} onClick={() => flyTo(c)}
                  className={`rounded-xl p-4 cursor-pointer transition border ${
                    selected?.id === c.id
                      ? 'bg-orange-900/30 border-orange-500'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                  }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{TYPE_EMOJI[c.type] || '⚠️'}</span>
                      <span className="font-semibold text-sm leading-tight">{c.title}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-1 flex-shrink-0 ${
                      c.urgency === 'critical' ? 'bg-red-500 text-white' :
                      c.urgency === 'high' ? 'bg-orange-500 text-white' :
                      'bg-yellow-400 text-gray-900'}`}>
                      {c.urgency}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                    <MapPin className="w-3 h-3" />{c.location}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mb-1">
                    <div className={`h-1.5 rounded-full ${
                      c.riskScore >= 80 ? 'bg-red-500' :
                      c.riskScore >= 60 ? 'bg-orange-500' : 'bg-yellow-400'}`}
                      style={{ width: `${c.riskScore}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Risk: {c.riskScore}/100</span>
                    <span>👥 {c.affectedPeople?.toLocaleString()}</span>
                  </div>
                  {c.source && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.source === 'GDACS'
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-purple-900/50 text-purple-400'}`}>
                      {c.source === 'GDACS' ? '🌍 Live GDACS Data' : '🤖 Gemini AI'}
                    </span>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}