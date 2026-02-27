'use client';

import { useState, useEffect } from 'react';

// Types
interface Trip {
  id: string;
  date: string;
  tripType: string;
  serviceArea?: string;
  pickupDatetime?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupTime?: string;
  dropoffTime?: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  dayCount?: number;
  clientName?: string;
  status: string;
  computedPay: number;
  finalPay: number;
}

interface Settings {
  p2pAtlantaRate: number;
  p2pOutsideRate: number;
  hourlyRate: number;
  outOfTownDailyRate: number;
  roundingDefault: string;
  privacyMode: boolean;
  taxRate: number;
}

// Default settings
const DEFAULT_SETTINGS: Settings = {
  p2pAtlantaRate: 25,
  p2pOutsideRate: 38,
  hourlyRate: 20,
  outOfTownDailyRate: 300,
  roundingDefault: 'NEAREST_15_MIN',
  privacyMode: false,
  taxRate: 5.75,
};

// Demo data
const INITIAL_TRIPS: Trip[] = [
  {
    id: '1',
    date: '2026-02-26',
    tripType: 'POINT_TO_POINT',
    serviceArea: 'ATLANTA_IN_PERIMETER',
    pickupDatetime: '2026-02-26T08:00:00',
    pickupAddress: '123 Main St, Atlanta, GA',
    dropoffAddress: '456 Peachtree Rd, Atlanta, GA',
    pickupTime: '08:00',
    dropoffTime: '08:45',
    status: 'COMPLETED',
    computedPay: 25,
    finalPay: 25,
  },
  {
    id: '2',
    date: '2026-02-26',
    tripType: 'DIRECTED_HOURLY',
    pickupDatetime: '2026-02-26T10:00:00',
    startTime: '2026-02-26T10:00:00',
    endTime: '2026-02-26T14:30:00',
    breakMinutes: 30,
    status: 'COMPLETED',
    computedPay: 80,
    finalPay: 80,
  },
  {
    id: '3',
    date: '2026-02-25',
    tripType: 'POINT_TO_POINT',
    serviceArea: 'OUTSIDE_PERIMETER',
    pickupDatetime: '2026-02-25T09:00:00',
    pickupAddress: '100 Airport Blvd',
    dropoffAddress: '250 Marietta St',
    pickupTime: '09:00',
    dropoffTime: '10:15',
    status: 'COMPLETED',
    computedPay: 38,
    finalPay: 38,
  },
  {
    id: '4',
    date: '2026-02-25',
    tripType: 'OUT_OF_TOWN_DAILY',
    pickupDatetime: '2026-02-25T07:00:00',
    dayCount: 2,
    status: 'COMPLETED',
    computedPay: 600,
    finalPay: 600,
  },
];

// Trip type configurations
const TRIP_TYPES = [
  { id: 'P2P_ATL', type: 'POINT_TO_POINT', serviceArea: 'ATLANTA_IN_PERIMETER', label: 'P2P Atlanta', price: '$25', icon: '📍', color: 'blue' },
  { id: 'P2P_OUTSIDE', type: 'POINT_TO_POINT', serviceArea: 'OUTSIDE_PERIMETER', label: 'P2P Outside', price: '$38', icon: '🗺️', color: 'purple' },
  { id: 'HOURLY', type: 'DIRECTED_HOURLY', label: 'Hourly', price: '$20/hr', icon: '⏱️', color: 'orange' },
  { id: 'OUT_OF_TOWN', type: 'OUT_OF_TOWN_DAILY', label: 'Out-of-town', price: '$300/day', icon: '🏨', color: 'teal' },
];

export default function JoffreTripPlanner() {
  // State
  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeView, setActiveView] = useState<'dashboard' | 'new-trip' | 'timer' | 'reports' | 'settings'>('dashboard');
  const [selectedTripType, setSelectedTripType] = useState<string | null>(null);
  
  // Edit mode
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  
  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [breakMinutes, setBreakMinutes] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    pickupTime: '',
    dropoffTime: '',
    pickupAddress: '',
    dropoffAddress: '',
    clientName: '',
    notes: '',
    dayCount: 1,
    finalPay: 0,
    breakMinutes: 0,
  });

  // Load from localStorage
  useEffect(() => {
    const savedTrips = localStorage.getItem('joffre_trips');
    const savedSettings = localStorage.getItem('joffre_settings');
    if (savedTrips) {
      setTrips(JSON.parse(savedTrips));
    }
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('joffre_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem('joffre_settings', JSON.stringify(settings));
  }, [settings]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerStart) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - timerStart.getTime()) / 1000) - (breakMinutes * 60);
        setElapsedTime(Math.max(0, elapsed));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerStart, breakMinutes]);

  // Calculate stats
  const getTodayTrips = () => {
    const today = new Date().toISOString().split('T')[0];
    return trips.filter(t => t.date === today && t.status === 'COMPLETED');
  };

  const getTodayEarnings = () => getTodayTrips().reduce((sum, t) => sum + t.finalPay, 0);
  const getTotalEarnings = () => trips.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + t.finalPay, 0);
  const getTotalTrips = () => trips.filter(t => t.status === 'COMPLETED').length;

  // Georgia tax calculator
  const calculateTax = (amount: number) => {
    return (amount * settings.taxRate / 100);
  };

  const getNetEarnings = () => {
    const gross = getTotalEarnings();
    const tax = calculateTax(gross);
    return gross - tax;
  };

  // Calculate time-based pay
  const calculateTimePay = (pickupTime: string, dropoffTime: string, breakMins: number = 0): { hours: number; pay: number } => {
    if (!pickupTime || !dropoffTime) return { hours: 0, pay: 0 };
    
    const [pickupH, pickupM] = pickupTime.split(':').map(Number);
    const [dropoffH, dropoffM] = dropoffTime.split(':').map(Number);
    
    const pickupMinutes = pickupH * 60 + pickupM;
    let dropoffMinutes = dropoffH * 60 + dropoffM;
    
    if (dropoffMinutes < pickupMinutes) {
      dropoffMinutes += 24 * 60;
    }
    
    const totalMinutes = dropoffMinutes - pickupMinutes - breakMins;
    const hours = Math.max(0, totalMinutes / 60);
    
    let roundedMinutes = totalMinutes;
    if (settings.roundingDefault === 'NEAREST_15_MIN') {
      roundedMinutes = Math.round(totalMinutes / 15) * 15;
    } else if (settings.roundingDefault === 'UP_TO_15_MIN') {
      roundedMinutes = Math.ceil(totalMinutes / 15) * 15;
    }
    
    const pay = Math.round(settings.hourlyRate * (roundedMinutes / 60) * 100) / 100;
    
    return { hours: Math.round(hours * 100) / 100, pay };
  };

  // Format time
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate timer estimate
  const getTimerEstimate = () => {
    const hours = elapsedTime / 3600;
    const pay = Math.round(settings.hourlyRate * hours * 100) / 100;
    return `$${pay.toFixed(2)}`;
  };

  // Start timer
  const startTimer = () => {
    setTimerStart(new Date());
    setTimerRunning(true);
    setBreakMinutes(0);
  };

  // Stop timer
  const stopTimer = () => {
    if (timerStart) {
      const endTime = new Date();
      const newTrip: Trip = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        tripType: 'DIRECTED_HOURLY',
        pickupDatetime: timerStart.toISOString(),
        startTime: timerStart.toISOString(),
        endTime: endTime.toISOString(),
        pickupTime: timerStart.toTimeString().slice(0, 5),
        dropoffTime: endTime.toTimeString().slice(0, 5),
        breakMinutes,
        status: 'COMPLETED',
        computedPay: Math.round(settings.hourlyRate * (elapsedTime / 3600) * 100) / 100,
        finalPay: Math.round(settings.hourlyRate * (elapsedTime / 3600) * 100) / 100,
      };
      setTrips([newTrip, ...trips]);
    }
    setTimerRunning(false);
    setTimerStart(null);
    setElapsedTime(0);
    setBreakMinutes(0);
    setActiveView('dashboard');
  };

  // Create trip
  const createTrip = () => {
    if (!selectedTripType) return;
    
    const tripConfig = TRIP_TYPES.find(t => t.id === selectedTripType);
    if (!tripConfig) return;

    let computedPay = 0;
    let hours = 0;
    
    if (tripConfig.id === 'P2P_ATL') {
      computedPay = settings.p2pAtlantaRate;
    } else if (tripConfig.id === 'P2P_OUTSIDE') {
      computedPay = settings.p2pOutsideRate;
    } else if (tripConfig.id === 'HOURLY') {
      const timeResult = calculateTimePay(formData.pickupTime, formData.dropoffTime, formData.breakMinutes);
      hours = timeResult.hours;
      computedPay = timeResult.pay;
    } else if (tripConfig.id === 'OUT_OF_TOWN') {
      computedPay = settings.outOfTownDailyRate * formData.dayCount;
    }

    const newTrip: Trip = {
      id: Date.now().toString(),
      date: formData.date,
      tripType: tripConfig.type,
      serviceArea: tripConfig.serviceArea,
      pickupDatetime: formData.pickupTime ? `${formData.date}T${formData.pickupTime}` : undefined,
      pickupAddress: formData.pickupAddress,
      dropoffAddress: formData.dropoffAddress,
      pickupTime: formData.pickupTime,
      dropoffTime: formData.dropoffTime,
      clientName: formData.clientName,
      dayCount: tripConfig.id === 'OUT_OF_TOWN' ? formData.dayCount : undefined,
      breakMinutes: tripConfig.id === 'HOURLY' ? formData.breakMinutes : undefined,
      status: 'COMPLETED',
      computedPay,
      finalPay: formData.finalPay || computedPay,
    };

    setTrips([newTrip, ...trips]);
    setActiveView('dashboard');
    setSelectedTripType(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      pickupTime: '',
      dropoffTime: '',
      pickupAddress: '',
      dropoffAddress: '',
      clientName: '',
      notes: '',
      dayCount: 1,
      finalPay: 0,
      breakMinutes: 0,
    });
  };

  // Update trip
  const updateTrip = () => {
    if (!editingTrip) return;
    
    const updatedTrips = trips.map(t => 
      t.id === editingTrip.id ? { ...editingTrip } : t
    );
    setTrips(updatedTrips);
    setEditingTrip(null);
    setActiveView('dashboard');
  };

  // Delete trip
  const deleteTrip = (id: string) => {
    setTrips(trips.filter(t => t.id !== id));
  };

  // Start editing trip
  const startEditTrip = (trip: Trip) => {
    setEditingTrip({ ...trip });
    setFormData({
      date: trip.date,
      pickupTime: trip.pickupTime || '',
      dropoffTime: trip.dropoffTime || '',
      pickupAddress: trip.pickupAddress || '',
      dropoffAddress: trip.dropoffAddress || '',
      clientName: trip.clientName || '',
      notes: '',
      dayCount: trip.dayCount || 1,
      finalPay: trip.finalPay,
      breakMinutes: trip.breakMinutes || 0,
    });
    
    if (trip.tripType === 'POINT_TO_POINT') {
      setSelectedTripType(trip.serviceArea === 'ATLANTA_IN_PERIMETER' ? 'P2P_ATL' : 'P2P_OUTSIDE');
    } else if (trip.tripType === 'DIRECTED_HOURLY') {
      setSelectedTripType('HOURLY');
    } else if (trip.tripType === 'OUT_OF_TOWN_DAILY') {
      setSelectedTripType('OUT_OF_TOWN');
    }
    setActiveView('new-trip');
  };

  // Get trip type label
  const getTripTypeLabel = (trip: Trip) => {
    if (trip.tripType === 'POINT_TO_POINT') {
      return trip.serviceArea === 'ATLANTA_IN_PERIMETER' ? 'P2P Atlanta' : 'P2P Outside';
    }
    if (trip.tripType === 'DIRECTED_HOURLY') return 'Hourly';
    if (trip.tripType === 'OUT_OF_TOWN_DAILY') return 'Out-of-town';
    return trip.tripType;
  };

  // Get trip icon
  const getTripIcon = (trip: Trip) => {
    if (trip.tripType === 'POINT_TO_POINT') {
      return trip.serviceArea === 'ATLANTA_IN_PERIMETER' ? '📍' : '🗺️';
    }
    if (trip.tripType === 'DIRECTED_HOURLY') return '⏱️';
    if (trip.tripType === 'OUT_OF_TOWN_DAILY') return '🏨';
    return '🚗';
  };

  // Get time duration string
  const getTripDuration = (trip: Trip) => {
    if (trip.pickupTime && trip.dropoffTime) {
      const [pickupH, pickupM] = trip.pickupTime.split(':').map(Number);
      const [dropoffH, dropoffM] = trip.dropoffTime.split(':').map(Number);
      let dropoffMins = dropoffH * 60 + dropoffM;
      let pickupMins = pickupH * 60 + pickupM;
      if (dropoffMins < pickupMins) dropoffMins += 24 * 60;
      const mins = dropoffMins - pickupMins - (trip.breakMinutes || 0);
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    if (trip.startTime && trip.endTime) {
      const start = new Date(trip.startTime).getTime();
      const end = new Date(trip.endTime).getTime();
      const mins = Math.floor((end - start) / 60000) - (trip.breakMinutes || 0);
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return null;
  };

  // Render sidebar
  const renderSidebar = () => (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">🚗</div>
        <span className="sidebar-title">Joffre Trip Planner</span>
      </div>
      <nav className="sidebar-nav">
        <button className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>
          <span className="nav-icon">📊</span>
          <span>Dashboard</span>
        </button>
        <button className={`nav-item ${activeView === 'new-trip' ? 'active' : ''}`} onClick={() => { setSelectedTripType(null); setEditingTrip(null); setActiveView('new-trip'); }}>
          <span className="nav-icon">➕</span>
          <span>New Trip</span>
        </button>
        <button className={`nav-item ${activeView === 'timer' ? 'active' : ''}`} onClick={() => setActiveView('timer')}>
          <span className="nav-icon">⏱️</span>
          <span>Timer</span>
        </button>
        <button className={`nav-item ${activeView === 'reports' ? 'active' : ''}`} onClick={() => setActiveView('reports')}>
          <span className="nav-icon">📈</span>
          <span>Reports</span>
        </button>
        <button className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}>
          <span className="nav-icon">⚙️</span>
          <span>Settings</span>
        </button>
      </nav>
    </aside>
  );

  // Render dashboard
  const renderDashboard = () => (
    <div className="fade-in">
      <h1 className="page-title">Dashboard</h1>
      
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Today's Earnings</div>
          <div className="stat-value green">${getTodayEarnings().toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Week (Gross)</div>
          <div className="stat-value">${getTotalEarnings().toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Trips</div>
          <div className="stat-value blue">{getTotalTrips()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net Earnings (After Tax)</div>
          <div className="stat-value green">${getNetEarnings().toFixed(2)}</div>
        </div>
      </div>

      {/* Georgia Tax Info */}
      <div className="card" style={{ marginBottom: '24px', background: 'rgba(10, 132, 255, 0.1)', border: '1px solid rgba(10, 132, 255, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--system-blue)' }}>🇺🇸 Georgia Tax Calculator</div>
            <div style={{ fontSize: '12px', color: 'var(--system-text-secondary)', marginTop: '4px' }}>
              Gross: ${getTotalEarnings().toFixed(2)} - Tax ({settings.taxRate}%): ${calculateTax(getTotalEarnings()).toFixed(2)} = Net: ${getNetEarnings().toFixed(2)}
            </div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => setActiveView('settings')}>Adjust Rate</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section">
        <div className="section-title">Quick Actions</div>
        <div className="quick-actions">
          <div className="quick-action" onClick={() => { setSelectedTripType('P2P_ATL'); setEditingTrip(null); setActiveView('new-trip'); }}>
            <span className="quick-action-icon">📍</span>
            <span className="quick-action-label">P2P Atlanta</span>
            <span className="quick-action-price">$25</span>
          </div>
          <div className="quick-action" onClick={() => { setSelectedTripType('P2P_OUTSIDE'); setEditingTrip(null); setActiveView('new-trip'); }}>
            <span className="quick-action-icon">🗺️</span>
            <span className="quick-action-label">P2P Outside</span>
            <span className="quick-action-price">$38</span>
          </div>
          <div className="quick-action" onClick={() => { setSelectedTripType('HOURLY'); setActiveView('timer'); }}>
            <span className="quick-action-icon">⏱️</span>
            <span className="quick-action-label">Start Hourly</span>
            <span className="quick-action-price">$20/hr</span>
          </div>
          <div className="quick-action" onClick={() => { setSelectedTripType('OUT_OF_TOWN'); setEditingTrip(null); setActiveView('new-trip'); }}>
            <span className="quick-action-icon">🏨</span>
            <span className="quick-action-label">Out-of-town</span>
            <span className="quick-action-price">$300/day</span>
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="section">
        <div className="section-title">Recent Trips</div>
        <div className="trip-list">
          {trips.slice(0, 10).map(trip => (
            <div key={trip.id} className="trip-item">
              <div className="trip-info">
                <div className={`trip-type-badge ${trip.tripType === 'POINT_TO_POINT' ? (trip.serviceArea === 'ATLANTA_IN_PERIMETER' ? 'p2p-atl' : 'p2p-outside') : trip.tripType === 'DIRECTED_HOURLY' ? 'hourly' : 'out-of-town'}`}>
                  {getTripIcon(trip)}
                </div>
                <div className="trip-details">
                  <span className="trip-type-label">{getTripTypeLabel(trip)}</span>
                  <span className="trip-date">{trip.date}</span>
                  {getTripDuration(trip) && <span className="trip-date" style={{ color: 'var(--system-blue)' }}>⏱️ {getTripDuration(trip)}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="status-badge status-completed">{trip.status}</span>
                <span className="trip-amount">${trip.finalPay.toFixed(2)}</span>
                <button className="btn btn-sm btn-secondary" onClick={() => startEditTrip(trip)}>✏️</button>
                <button className="btn btn-sm btn-secondary" onClick={() => deleteTrip(trip.id)}>✕</button>
              </div>
            </div>
          ))}
          {trips.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🚗</div>
              <div className="empty-state-text">No trips yet. Create your first trip!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Calculate preview pay for form
  const getFormPreviewPay = () => {
    if (selectedTripType === 'HOURLY' && formData.pickupTime && formData.dropoffTime) {
      return calculateTimePay(formData.pickupTime, formData.dropoffTime, formData.breakMinutes);
    }
    if (selectedTripType === 'P2P_ATL') return { hours: 0, pay: settings.p2pAtlantaRate };
    if (selectedTripType === 'P2P_OUTSIDE') return { hours: 0, pay: settings.p2pOutsideRate };
    if (selectedTripType === 'OUT_OF_TOWN') return { hours: 0, pay: settings.outOfTownDailyRate * formData.dayCount };
    return { hours: 0, pay: 0 };
  };

  // Render new trip form
  const renderNewTrip = () => {
    const preview = getFormPreviewPay();
    
    return (
      <div className="fade-in">
        <h1 className="page-title">{editingTrip ? 'Edit Trip' : 'New Trip'}</h1>
        
        {/* Trip Type Selection */}
        <div className="section">
          <div className="section-title">Select Trip Type</div>
          <div className="trip-type-grid">
            {TRIP_TYPES.map(type => (
              <div
                key={type.id}
                className={`trip-type-card ${selectedTripType === type.id ? 'selected' : ''}`}
                onClick={() => !editingTrip && setSelectedTripType(type.id)}
                style={{ opacity: editingTrip ? 0.6 : 1 }}
              >
                <div className="trip-type-icon">{type.icon}</div>
                <div className="trip-type-name">{type.label}</div>
                <div className="trip-type-price">{type.price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trip Details */}
        {selectedTripType && (
          <div className="card fade-in">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={editingTrip ? editingTrip.date : formData.date}
                onChange={e => {
                  if (editingTrip) {
                    setEditingTrip({ ...editingTrip, date: e.target.value });
                  } else {
                    setFormData({ ...formData, date: e.target.value });
                  }
                }}
              />
            </div>

            {(selectedTripType === 'P2P_ATL' || selectedTripType === 'P2P_OUTSIDE' || selectedTripType === 'HOURLY') && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Pickup Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={editingTrip ? (editingTrip.pickupTime || '') : formData.pickupTime}
                      onChange={e => {
                        if (editingTrip) {
                          setEditingTrip({ ...editingTrip, pickupTime: e.target.value });
                        } else {
                          setFormData({ ...formData, pickupTime: e.target.value });
                        }
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dropoff Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={editingTrip ? (editingTrip.dropoffTime || '') : formData.dropoffTime}
                      onChange={e => {
                        if (editingTrip) {
                          setEditingTrip({ ...editingTrip, dropoffTime: e.target.value });
                        } else {
                          setFormData({ ...formData, dropoffTime: e.target.value });
                        }
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {selectedTripType === 'HOURLY' && (
              <div className="form-group">
                <label className="form-label">Break Minutes</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={editingTrip ? (editingTrip.breakMinutes || 0) : formData.breakMinutes}
                  onChange={e => {
                    const mins = parseInt(e.target.value) || 0;
                    if (editingTrip) {
                      setEditingTrip({ ...editingTrip, breakMinutes: mins });
                    } else {
                      setFormData({ ...formData, breakMinutes: mins });
                    }
                  }}
                />
              </div>
            )}

            {(selectedTripType === 'P2P_ATL' || selectedTripType === 'P2P_OUTSIDE' || selectedTripType === 'HOURLY') && (
              <>
                <div className="form-group">
                  <label className="form-label">Pickup Address</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="123 Main St, Atlanta, GA"
                    value={editingTrip ? (editingTrip.pickupAddress || '') : formData.pickupAddress}
                    onChange={e => {
                      if (editingTrip) {
                        setEditingTrip({ ...editingTrip, pickupAddress: e.target.value });
                      } else {
                        setFormData({ ...formData, pickupAddress: e.target.value });
                      }
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Dropoff Address (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="456 Peachtree Rd, Atlanta, GA"
                    value={editingTrip ? (editingTrip.dropoffAddress || '') : formData.dropoffAddress}
                    onChange={e => {
                      if (editingTrip) {
                        setEditingTrip({ ...editingTrip, dropoffAddress: e.target.value });
                      } else {
                        setFormData({ ...formData, dropoffAddress: e.target.value });
                      }
                    }}
                  />
                </div>
              </>
            )}

            {selectedTripType === 'OUT_OF_TOWN' && (
              <div className="form-group">
                <label className="form-label">Number of Days</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={editingTrip ? (editingTrip.dayCount || 1) : formData.dayCount}
                  onChange={e => {
                    const days = parseInt(e.target.value) || 1;
                    if (editingTrip) {
                      setEditingTrip({ ...editingTrip, dayCount: days, finalPay: settings.outOfTownDailyRate * days });
                    } else {
                      setFormData({ ...formData, dayCount: days });
                    }
                  }}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Client Name (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Acme Corp"
                value={editingTrip ? (editingTrip.clientName || '') : formData.clientName}
                onChange={e => {
                  if (editingTrip) {
                    setEditingTrip({ ...editingTrip, clientName: e.target.value });
                  } else {
                    setFormData({ ...formData, clientName: e.target.value });
                  }
                }}
              />
            </div>

            {/* Pay Preview */}
            {selectedTripType && !editingTrip && (
              <div className="card" style={{ background: 'rgba(48, 209, 88, 0.1)', border: '1px solid rgba(48, 209, 88, 0.3)', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--system-text-secondary)', marginBottom: '8px' }}>Calculated Pay</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {preview.hours > 0 && (
                      <div style={{ fontSize: '14px', color: 'var(--system-text)' }}>
                        {preview.hours.toFixed(2)} hours × ${settings.hourlyRate}/hr = <span style={{ fontWeight: 600 }}>${preview.pay.toFixed(2)}</span>
                      </div>
                    )}
                    {preview.hours === 0 && (
                      <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--system-green)' }}>${preview.pay.toFixed(2)}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--system-text-tertiary)' }}>
                    {settings.roundingDefault === 'NEAREST_15_MIN' && 'Rounded to nearest 15 min'}
                    {settings.roundingDefault === 'UP_TO_15_MIN' && 'Rounded up to 15 min'}
                    {settings.roundingDefault === 'EXACT' && 'Exact time'}
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Final Pay ($)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={editingTrip ? editingTrip.finalPay : formData.finalPay}
                onChange={e => {
                  const pay = parseFloat(e.target.value) || 0;
                  if (editingTrip) {
                    setEditingTrip({ ...editingTrip, finalPay: pay, computedPay: pay });
                  } else {
                    setFormData({ ...formData, finalPay: pay });
                  }
                }}
              />
              <small style={{ color: 'var(--system-text-tertiary)', fontSize: '11px' }}>Override calculated pay if needed</small>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => { setEditingTrip(null); setActiveView('dashboard'); }}>
                Cancel
              </button>
              {editingTrip ? (
                <button className="btn btn-primary btn-lg" onClick={updateTrip}>Update Trip</button>
              ) : (
                <button className="btn btn-primary btn-lg" onClick={createTrip}>Save Trip</button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render timer
  const renderTimer = () => (
    <div className="fade-in" style={{ textAlign: 'center', paddingTop: '40px' }}>
      <h1 className="page-title">Hourly Timer</h1>
      
      {/* Timer Display */}
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '48px' }}>
        <div className="timer-display">{formatTime(elapsedTime)}</div>
        <div className="timer-estimate" style={{ marginTop: '16px' }}>{getTimerEstimate()}</div>
        <p style={{ color: 'var(--system-text-secondary)', marginTop: '8px' }}>Estimated earnings</p>

        {/* Break buttons */}
        {timerRunning && (
          <div className="break-timer">
            {[0, 15, 30, 45, 60].map(mins => (
              <button
                key={mins}
                className={`break-btn ${breakMinutes === mins ? 'active' : ''}`}
                onClick={() => setBreakMinutes(mins)}
              >
                {mins} min
              </button>
            ))}
          </div>
        )}

        {/* Timer Controls */}
        <div className="timer-controls">
          {!timerRunning ? (
            <button className="btn btn-success btn-lg" onClick={startTimer}>
              ▶ Start Timer
            </button>
          ) : (
            <button className="btn btn-danger btn-lg" onClick={stopTimer}>
              ⏹ End Trip
            </button>
          )}
        </div>

        {/* Info */}
        <p style={{ color: 'var(--system-text-tertiary)', marginTop: '32px', fontSize: '13px' }}>
          💡 Break time is subtracted from your work hours
        </p>
      </div>
    </div>
  );

  // Render reports
  const renderReports = () => {
    const completedTrips = trips.filter(t => t.status === 'COMPLETED');
    const totalEarnings = completedTrips.reduce((sum, t) => sum + t.finalPay, 0);
    const taxAmount = calculateTax(totalEarnings);
    const netEarnings = totalEarnings - taxAmount;
    
    // Breakdown by type
    const byType: Record<string, { count: number; total: number; hours: number }> = {};
    completedTrips.forEach(t => {
      const type = getTripTypeLabel(t);
      if (!byType[type]) byType[type] = { count: 0, total: 0, hours: 0 };
      byType[type].count++;
      byType[type].total += t.finalPay;
      const duration = getTripDuration(t);
      if (duration) {
        const hoursMatch = duration.match(/(\d+)h\s*(\d+)m/);
        if (hoursMatch) {
          byType[type].hours += parseInt(hoursMatch[1]) + parseInt(hoursMatch[2]) / 60;
        }
      }
    });

    // Breakdown by date
    const byDate: Record<string, { count: number; total: number }> = {};
    completedTrips.forEach(t => {
      if (!byDate[t.date]) byDate[t.date] = { count: 0, total: 0 };
      byDate[t.date].count++;
      byDate[t.date].total += t.finalPay;
    });

    return (
      <div className="fade-in">
        <h1 className="page-title">Reports</h1>

        {/* Summary */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Gross Earnings</div>
            <div className="stat-value">${totalEarnings.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Georgia Tax ({settings.taxRate}%)</div>
            <div className="stat-value" style={{ color: 'var(--system-red)' }}>-${taxAmount.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Net Earnings</div>
            <div className="stat-value green">${netEarnings.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Trips</div>
            <div className="stat-value">{completedTrips.length}</div>
          </div>
        </div>

        {/* By Type */}
        <div className="section">
          <div className="section-title">By Trip Type</div>
          <div className="card">
            {Object.entries(byType).map(([type, data]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>{type}</span>
                <span style={{ display: 'flex', gap: '24px' }}>
                  {data.hours > 0 && <span style={{ color: 'var(--system-blue)' }}>{data.hours.toFixed(1)}h</span>}
                  <span style={{ color: 'var(--system-text-secondary)' }}>{data.count} trips</span>
                  <span style={{ color: 'var(--system-green)', fontWeight: 600 }}>${data.total.toFixed(2)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* By Date */}
        <div className="section">
          <div className="section-title">By Date</div>
          <div className="card">
            {Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, data]) => (
              <div key={date} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>{date}</span>
                <span style={{ display: 'flex', gap: '24px' }}>
                  <span style={{ color: 'var(--system-text-secondary)' }}>{data.count} trips</span>
                  <span style={{ color: 'var(--system-green)', fontWeight: 600 }}>${data.total.toFixed(2)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="section">
          <div className="section-title">Export</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => {
              const csv = ['Date,Type,Pickup Time,Dropoff Time,Hours,Amount,Tax,Net,Status'];
              trips.forEach(t => {
                const tax = calculateTax(t.finalPay);
                const duration = getTripDuration(t);
                const hoursMatch = duration ? duration.match(/(\d+)h\s*(\d+)m/) : null;
                const hours = hoursMatch ? (parseInt(hoursMatch[1]) + parseInt(hoursMatch[2]) / 60).toFixed(2) : '0';
                csv.push(`${t.date},${getTripTypeLabel(t)},${t.pickupTime || ''},${t.dropoffTime || ''},${hours},${t.finalPay},${tax.toFixed(2)},${(t.finalPay - tax).toFixed(2)},${t.status}`);
              });
              const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'joffre_trips_export.csv';
              a.click();
            }}>
              📄 Export CSV
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render settings
  const renderSettings = () => (
    <div className="fade-in">
      <h1 className="page-title">Settings</h1>

      <div className="card" style={{ maxWidth: '500px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Pay Rates</h3>
        
        <div className="form-group">
          <label className="form-label">P2P Atlanta Rate ($)</label>
          <input
            type="number"
            className="form-input"
            value={settings.p2pAtlantaRate}
            onChange={e => setSettings({ ...settings, p2pAtlantaRate: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">P2P Outside Rate ($)</label>
          <input
            type="number"
            className="form-input"
            value={settings.p2pOutsideRate}
            onChange={e => setSettings({ ...settings, p2pOutsideRate: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Hourly Rate ($/hr)</label>
          <input
            type="number"
            className="form-input"
            value={settings.hourlyRate}
            onChange={e => setSettings({ ...settings, hourlyRate: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Out-of-town Daily Rate ($)</label>
          <input
            type="number"
            className="form-input"
            value={settings.outOfTownDailyRate}
            onChange={e => setSettings({ ...settings, outOfTownDailyRate: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Default Rounding</label>
          <select
            className="form-input"
            value={settings.roundingDefault}
            onChange={e => setSettings({ ...settings, roundingDefault: e.target.value })}
          >
            <option value="EXACT">Exact</option>
            <option value="NEAREST_15_MIN">Nearest 15 min</option>
            <option value="UP_TO_15_MIN">Up to 15 min</option>
          </select>
        </div>

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>🇺🇸 Georgia Tax Settings</h3>
          
          <div className="form-group">
            <label className="form-label">Georgia Tax Rate (%)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={settings.taxRate}
              onChange={e => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
            />
            <small style={{ color: 'var(--system-text-tertiary)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
              Default: 5.75% (GA state + metro)
            </small>
          </div>
        </div>

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Data</h3>
          <button className="btn btn-danger" onClick={() => {
            if (confirm('Clear all trip data?')) {
              setTrips([]);
            }
          }}>
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {renderSidebar()}
      <main className="main-content">
        <header className="header">
          <span className="header-title">
            {activeView === 'dashboard' && 'Dashboard'}
            {activeView === 'new-trip' && (editingTrip ? 'Edit Trip' : 'New Trip')}
            {activeView === 'timer' && 'Hourly Timer'}
            {activeView === 'reports' && 'Reports'}
            {activeView === 'settings' && 'Settings'}
          </span>
          <div className="header-actions">
            <span style={{ fontSize: '13px', color: 'var(--system-text-secondary)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>
        <div className="content">
          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'new-trip' && renderNewTrip()}
          {activeView === 'timer' && renderTimer()}
          {activeView === 'reports' && renderReports()}
          {activeView === 'settings' && renderSettings()}
        </div>
      </main>
    </div>
  );
}
