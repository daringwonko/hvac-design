import React, { useState } from 'react';

const HVACSystemDesign = () => {
  const [activeView, setActiveView] = useState('floorplan');
  const [activeZone, setActiveZone] = useState(null);

  const zones = {
    masterBed: { name: 'Master Bedroom', sqft: 150, area: '~14 m²', btu: 9000, color: '#95E1D3', heating: 'Radiant + Mini-Split' },
    masterBath: { name: 'Master Bath', sqft: 55, area: '~5 m²', btu: 0, color: '#A8D8EA', heating: 'Radiant Floor' },
    bed2: { name: 'Bedroom 2', sqft: 120, area: '~11 m²', btu: 6000, color: '#F38181', heating: 'Radiant + Mini-Split' },
    bath2: { name: 'Bathroom 2', sqft: 45, area: '~4 m²', btu: 0, color: '#A8D8EA', heating: 'Radiant Floor' },
    laundry: { name: 'Laundry/Mech', sqft: 50, area: '~4.5 m²', btu: 0, color: '#DFE6E9', heating: 'Radiant Floor' },
    living: { name: 'Living Room', sqft: 220, area: '~20 m²', btu: 12000, color: '#4ECDC4', heating: 'Radiant + Mini-Split' },
    kitchen: { name: 'Kitchen', sqft: 180, area: '~17 m²', btu: 0, color: '#FFE66D', heating: 'Radiant Floor' },
    bed3: { name: 'Bedroom 3', sqft: 130, area: '~12 m²', btu: 6000, color: '#AA96DA', heating: 'Radiant + Mini-Split' },
    bath3: { name: 'Bathroom 3', sqft: 40, area: '~3.7 m²', btu: 0, color: '#A8D8EA', heating: 'Radiant Floor' },
    entry: { name: 'Entry', sqft: 35, area: '~3 m²', btu: 0, color: '#FFEAA7', heating: 'Radiant Floor' },
    corridor: { name: 'Central Corridor', sqft: 80, area: '900mm wide', btu: 0, color: '#dfe6e9', heating: 'Radiant Floor' }
  };

  const equipment = [
    { category: 'Heat Pump System', items: [
      { name: 'Multi-Zone Heat Pump Outdoor Unit', model: 'Mitsubishi MXZ-4C36NAHZ2', specs: '36,000 BTU, Hyper-Heat, -13°F operation', qty: 1, purpose: 'Powers all 4 mini-split heads + hydronic for radiant floor' },
      { name: 'Air-to-Water Heat Pump Module', model: 'SpacePak Solstice Extreme', specs: 'Hydronic heating interface', qty: 1, purpose: 'Connects heat pump to radiant floor system' },
    ]},
    { category: 'Mini-Split Indoor Units (4 Heads)', items: [
      { name: 'Living Room Wall Unit', model: 'Mitsubishi MSZ-FH12NA', specs: '12,000 BTU, WiFi enabled', qty: 1, purpose: 'Primary cooling + supplemental heat for open living/kitchen' },
      { name: 'Master Bedroom Wall Unit', model: 'Mitsubishi MSZ-FH09NA', specs: '9,000 BTU, Whisper quiet (19dB)', qty: 1, purpose: 'Individual climate control - install on wall shared with bath' },
      { name: 'Bedroom 2 Wall Unit', model: 'Mitsubishi MSZ-FH06NA', specs: '6,000 BTU, Compact', qty: 1, purpose: 'Individual climate control' },
      { name: 'Bedroom 3 Wall Unit', model: 'Mitsubishi MSZ-FH06NA', specs: '6,000 BTU, Compact', qty: 1, purpose: 'Individual climate control' },
    ]},
    { category: 'Radiant Floor Heating', items: [
      { name: 'PEX Tubing', model: 'Uponor hePEX 1/2"', specs: '~1,000 linear ft @ 9" spacing', qty: 1, purpose: 'In-floor hydronic heating loops for all zones' },
      { name: 'Manifold Assembly', model: 'Uponor EP Heating Manifold', specs: '8-port with flow meters & actuators', qty: 1, purpose: 'Zone distribution - located in laundry/mech room' },
      { name: 'Mixing Valve', model: 'Caleffi 521 Series', specs: 'Thermostatic, 3/4" sweat', qty: 1, purpose: 'Maintains safe floor temps (80-85°F max)' },
      { name: 'Circulation Pump', model: 'Grundfos Alpha2 15-55', specs: 'Variable speed, ECM motor', qty: 1, purpose: 'Efficient variable-flow circulation' },
      { name: 'Expansion Tank', model: 'Watts ET-30', specs: '4.7 gallon capacity', qty: 1, purpose: 'Hydronic pressure management' },
    ]},
    { category: 'Ventilation System (HRV)', items: [
      { name: 'Heat Recovery Ventilator', model: 'Panasonic Intelli-Balance 100', specs: '100 CFM, 80% heat recovery efficiency', qty: 1, purpose: 'Fresh air exchange - mount in laundry/mech area' },
      { name: 'MERV-13 Intake Filters', model: 'Custom fit media filters', specs: 'Located in kitchen corner dead space', qty: 2, purpose: 'Filter incoming fresh air before HRV' },
      { name: '6" Insulated Flex Duct', model: 'R-8 insulated', specs: '~60 linear feet', qty: 1, purpose: 'Fresh air distribution through ceiling' },
      { name: 'Ceiling Diffusers', model: 'Round 6" low-profile', specs: 'Living, Master, Bed 2, Bed 3', qty: 4, purpose: 'Fresh air supply to bedrooms + living' },
      { name: 'Exhaust Grilles', model: '4" bathroom exhaust', specs: 'All 3 bathrooms + kitchen', qty: 4, purpose: 'Stale air return to HRV' },
    ]},
    { category: 'Controls & Thermostats', items: [
      { name: 'Radiant Zone Controller', model: 'Tekmar 557', specs: '4-zone + outdoor reset', qty: 1, purpose: 'Coordinates radiant floor zones intelligently' },
      { name: 'Room Thermostats', model: 'Mysa Smart Thermostat', specs: 'WiFi, floor sensor compatible', qty: 4, purpose: 'Living, Master, Bed 2, Bed 3 control' },
      { name: 'Mini-Split Controller', model: 'Mitsubishi kumo cloud', specs: 'WiFi app integration', qty: 1, purpose: 'Smartphone control for all mini-splits' },
      { name: 'HRV Controller', model: 'Panasonic FV-VK105E2', specs: 'With humidity sensing', qty: 1, purpose: 'Automated ventilation based on conditions' },
    ]},
    { category: 'Mechanical Room Equipment (Laundry Area)', items: [
      { name: 'Electrical Panel', model: 'Square D Homeline', specs: '200A main, 40 space', qty: 1, purpose: 'Main power distribution' },
      { name: 'Low Voltage Transformer', model: 'Magnitude M300L24DC', specs: '300W, 24VDC output', qty: 2, purpose: 'LED lighting drivers' },
      { name: 'Whole House Water Filter', model: 'Pentair Pelican PC600', specs: '3-stage, 10 GPM', qty: 1, purpose: 'Sediment + carbon filtration' },
      { name: 'Heat Pump Water Heater', model: 'Rheem ProTerra 50gal', specs: 'Hybrid, 3.75 UEF', qty: 1, purpose: 'Efficient domestic hot water' },
    ]}
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      color: '#e8e8e8',
      padding: '24px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        
        .tab-btn {
          padding: 12px 24px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #a0a0a0;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
        }
        .tab-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
        .tab-btn.active {
          background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%);
          color: #1a1a2e;
          border-color: #4ECDC4;
        }
        .equipment-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          transition: all 0.3s ease;
        }
        .equipment-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(78, 205, 196, 0.3);
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 700, 
          margin: 0,
          background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          HVAC System Design
        </h1>
        <p style={{ color: '#888', marginTop: '8px', fontSize: '16px' }}>
          Goldilocks Home 3B-3B • Linear Modular Layout • ~100 m² / 1,075 sq ft
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '8px', 
        marginBottom: '32px',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'floorplan', label: '📐 Floor Plan & Zones' },
          { id: 'ductwork', label: '🌬️ Ductwork & Ventilation' },
          { id: 'mechanical', label: '🔧 Mechanical Room' },
          { id: 'equipment', label: '📋 Equipment List' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeView === tab.id ? 'active' : ''}`}
            onClick={() => setActiveView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Floor Plan View - Based on actual SketchUp layout */}
      {activeView === 'floorplan' && (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600 }}>
              HVAC Zone Layout — Accurate to Your Design
            </h2>
            <p style={{ color: '#888', margin: '0 0 24px 0', fontSize: '14px' }}>
              Click zones to see details • Linear modular layout ~14m x 5.5m
            </p>

            {/* Floor Plan SVG - Accurate to SketchUp */}
            <svg viewBox="0 0 1000 400" style={{ width: '100%', height: 'auto' }}>
              {/* Background grid */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
                </pattern>
                <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#4ECDC4" />
                </marker>
              </defs>
              <rect width="1000" height="400" fill="url(#grid)" />

              {/* House Outline - Linear Rectangle */}
              <rect x="30" y="40" width="940" height="320" fill="none" stroke="#4ECDC4" strokeWidth="3" rx="4"/>

              {/* ===== LEFT SECTION: Master Suite ===== */}
              
              {/* Master Bedroom - Upper Left */}
              <g onClick={() => setActiveZone('masterBed')} style={{ cursor: 'pointer' }}>
                <rect x="35" y="45" width="160" height="150" fill={zones.masterBed.color} fillOpacity="0.3" stroke={zones.masterBed.color} strokeWidth="2" rx="2"/>
                <text x="115" y="100" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600">Master</text>
                <text x="115" y="118" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600">Bedroom</text>
                <text x="115" y="138" textAnchor="middle" fill="#ddd" fontSize="10">~14 m²</text>
                {/* Bed icon */}
                <rect x="55" y="70" width="50" height="80" fill="#2C3E50" stroke="#95E1D3" strokeWidth="1" rx="3"/>
                {/* Mini-split head */}
                <rect x="160" y="60" width="30" height="12" fill="#fff" rx="2"/>
                <text x="175" y="85" textAnchor="middle" fill="#4ECDC4" fontSize="8" fontWeight="600">9K BTU</text>
                {/* Radiant floor indicator */}
                <path d="M50 170 Q80 185 110 170 Q140 155 170 170" stroke="#FF6B6B" strokeWidth="2" fill="none" strokeDasharray="5,5" opacity="0.6"/>
              </g>

              {/* Master Bath - Adjacent to Master Bed */}
              <g onClick={() => setActiveZone('masterBath')} style={{ cursor: 'pointer' }}>
                <rect x="35" y="200" width="100" height="85" fill={zones.masterBath.color} fillOpacity="0.3" stroke={zones.masterBath.color} strokeWidth="2" rx="2"/>
                <text x="85" y="235" textAnchor="middle" fill="#333" fontSize="11" fontWeight="600">Master</text>
                <text x="85" y="250" textAnchor="middle" fill="#333" fontSize="11" fontWeight="600">Bath</text>
                <text x="85" y="268" textAnchor="middle" fill="#555" fontSize="9">~5 m²</text>
                {/* Toilet icon */}
                <ellipse cx="60" cy="230" rx="10" ry="12" fill="#fff" stroke="#A8D8EA"/>
              </g>

              {/* ===== BEDROOM 2 SECTION ===== */}
              
              {/* Bedroom 2 - Lower Left */}
              <g onClick={() => setActiveZone('bed2')} style={{ cursor: 'pointer' }}>
                <rect x="35" y="290" width="160" height="65" fill={zones.bed2.color} fillOpacity="0.3" stroke={zones.bed2.color} strokeWidth="2" rx="2"/>
                <text x="115" y="320" textAnchor="middle" fill="#333" fontSize="12" fontWeight="600">Bedroom 2</text>
                <text x="115" y="340" textAnchor="middle" fill="#555" fontSize="10">~11 m²</text>
                {/* Mini-split head */}
                <rect x="160" y="300" width="30" height="12" fill="#fff" rx="2"/>
                <text x="175" y="325" textAnchor="middle" fill="#4ECDC4" fontSize="8" fontWeight="600">6K BTU</text>
              </g>

              {/* Bath 2 */}
              <g onClick={() => setActiveZone('bath2')} style={{ cursor: 'pointer' }}>
                <rect x="140" y="200" width="70" height="85" fill={zones.bath2.color} fillOpacity="0.3" stroke={zones.bath2.color} strokeWidth="2" rx="2"/>
                <text x="175" y="240" textAnchor="middle" fill="#333" fontSize="11" fontWeight="600">Bath 2</text>
                <text x="175" y="258" textAnchor="middle" fill="#555" fontSize="9">~4 m²</text>
                <ellipse cx="160" cy="230" rx="8" ry="10" fill="#fff" stroke="#A8D8EA"/>
              </g>

              {/* ===== LAUNDRY/MECHANICAL ===== */}
              <g onClick={() => setActiveZone('laundry')} style={{ cursor: 'pointer' }}>
                <rect x="200" y="45" width="90" height="150" fill={zones.laundry.color} fillOpacity="0.4" stroke={zones.laundry.color} strokeWidth="2" rx="2"/>
                <text x="245" y="90" textAnchor="middle" fill="#333" fontSize="10" fontWeight="600">LAUNDRY</text>
                <text x="245" y="105" textAnchor="middle" fill="#333" fontSize="10" fontWeight="600">MECHANICAL</text>
                {/* Washer/Dryer stack icon */}
                <rect x="220" y="115" width="30" height="50" fill="#fff" stroke="#666" strokeWidth="1" rx="2"/>
                <line x1="220" y1="140" x2="250" y2="140" stroke="#666"/>
                <text x="245" y="175" textAnchor="middle" fill="#666" fontSize="8">W/D</text>
                {/* Equipment labels */}
                <text x="245" y="188" textAnchor="middle" fill="#e74c3c" fontSize="7">Panel • HRV</text>
              </g>

              {/* ===== CENTRAL CORRIDOR ===== */}
              <g onClick={() => setActiveZone('corridor')} style={{ cursor: 'pointer' }}>
                <rect x="215" y="200" width="520" height="50" fill={zones.corridor.color} fillOpacity="0.2" stroke={zones.corridor.color} strokeWidth="1" strokeDasharray="5,5" rx="2"/>
                <text x="475" y="230" textAnchor="middle" fill="#888" fontSize="11" fontWeight="500">Central Corridor — 900mm wide — Duct Distribution Zone</text>
              </g>

              {/* ===== LIVING ROOM ===== */}
              <g onClick={() => setActiveZone('living')} style={{ cursor: 'pointer' }}>
                <rect x="295" y="45" width="200" height="150" fill={zones.living.color} fillOpacity="0.3" stroke={zones.living.color} strokeWidth="2" rx="2"/>
                <text x="395" y="90" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">Living Room</text>
                <text x="395" y="110" textAnchor="middle" fill="#ddd" fontSize="11">~20 m²</text>
                {/* L-shaped sectional sofa */}
                <path d="M320 130 L320 175 L420 175 L420 155 L340 155 L340 130 Z" fill="#2C3E50" stroke="#4ECDC4" strokeWidth="1"/>
                {/* Mini-split head */}
                <rect x="460" y="60" width="30" height="12" fill="#fff" rx="2"/>
                <text x="475" y="85" textAnchor="middle" fill="#4ECDC4" fontSize="8" fontWeight="600">12K BTU</text>
                {/* Radiant floor */}
                <path d="M310 165 Q350 180 390 165 Q430 150 470 165" stroke="#FF6B6B" strokeWidth="2" fill="none" strokeDasharray="5,5" opacity="0.6"/>
              </g>

              {/* ===== KITCHEN ===== */}
              <g onClick={() => setActiveZone('kitchen')} style={{ cursor: 'pointer' }}>
                <rect x="500" y="45" width="230" height="150" fill={zones.kitchen.color} fillOpacity="0.3" stroke={zones.kitchen.color} strokeWidth="2" rx="2"/>
                <text x="615" y="85" textAnchor="middle" fill="#333" fontSize="14" fontWeight="600">Kitchen</text>
                <text x="615" y="105" textAnchor="middle" fill="#555" fontSize="11">~17 m²</text>
                {/* L-shaped counter */}
                <path d="M680 50 L680 100 L590 100 L590 140 L510 140 L510 180 L530 180 L530 160 L610 160 L610 120 L700 120 L700 50 Z" fill="#8B7355" fillOpacity="0.5" stroke="#8B7355" strokeWidth="1"/>
                {/* Range */}
                <rect x="640" y="55" width="30" height="30" fill="#333" stroke="#666" rx="2"/>
                <text x="655" y="100" textAnchor="middle" fill="#888" fontSize="7">Range</text>
                {/* Island */}
                <rect x="540" y="110" width="80" height="35" fill="#8B7355" fillOpacity="0.4" stroke="#8B7355" strokeWidth="1" rx="2"/>
                
                {/* DEAD SPACE for HRV filters - HIGHLIGHTED */}
                <rect x="685" y="50" width="40" height="45" fill="#FF6B6B" fillOpacity="0.4" stroke="#FF6B6B" strokeWidth="2" strokeDasharray="3,3"/>
                <text x="705" y="68" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="600">HRV</text>
                <text x="705" y="78" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="600">FILTER</text>
                <text x="705" y="88" textAnchor="middle" fill="#fff" fontSize="6">Dead Space</text>
              </g>

              {/* ===== BATH 3 ===== */}
              <g onClick={() => setActiveZone('bath3')} style={{ cursor: 'pointer' }}>
                <rect x="735" y="45" width="75" height="90" fill={zones.bath3.color} fillOpacity="0.3" stroke={zones.bath3.color} strokeWidth="2" rx="2"/>
                <text x="772" y="80" textAnchor="middle" fill="#333" fontSize="11" fontWeight="600">Bath 3</text>
                <text x="772" y="98" textAnchor="middle" fill="#555" fontSize="9">~3.7 m²</text>
                <ellipse cx="760" cy="115" rx="8" ry="10" fill="#fff" stroke="#A8D8EA"/>
              </g>

              {/* ===== BEDROOM 3 ===== */}
              <g onClick={() => setActiveZone('bed3')} style={{ cursor: 'pointer' }}>
                <rect x="735" y="255" width="160" height="100" fill={zones.bed3.color} fillOpacity="0.3" stroke={zones.bed3.color} strokeWidth="2" rx="2"/>
                <text x="815" y="295" textAnchor="middle" fill="#333" fontSize="13" fontWeight="600">Bedroom 3</text>
                <text x="815" y="315" textAnchor="middle" fill="#555" fontSize="10">~12 m²</text>
                {/* Mini-split head */}
                <rect x="860" y="265" width="30" height="12" fill="#fff" rx="2"/>
                <text x="875" y="290" textAnchor="middle" fill="#4ECDC4" fontSize="8" fontWeight="600">6K BTU</text>
                {/* Radiant floor */}
                <path d="M755 335 Q800 350 845 335 Q875 325 875 335" stroke="#FF6B6B" strokeWidth="2" fill="none" strokeDasharray="5,5" opacity="0.6"/>
              </g>

              {/* ===== ENTRY ===== */}
              <g onClick={() => setActiveZone('entry')} style={{ cursor: 'pointer' }}>
                <rect x="900" y="255" width="65" height="100" fill={zones.entry.color} fillOpacity="0.3" stroke={zones.entry.color} strokeWidth="2" rx="2"/>
                <text x="932" y="300" textAnchor="middle" fill="#333" fontSize="11" fontWeight="600">Entry</text>
                <text x="932" y="318" textAnchor="middle" fill="#555" fontSize="9">~3 m²</text>
                {/* Door */}
                <rect x="958" y="290" width="8" height="30" fill="#4ECDC4"/>
              </g>

              {/* POST for duct chase - between living and kitchen */}
              <rect x="490" y="160" width="15" height="35" fill="#666" stroke="#888" strokeWidth="1"/>
              <text x="497" y="205" textAnchor="middle" fill="#4ECDC4" fontSize="7" fontWeight="600">POST</text>
              <text x="497" y="213" textAnchor="middle" fill="#888" fontSize="6">Duct Chase</text>

              {/* Outdoor Heat Pump Unit */}
              <g>
                <rect x="950" y="140" width="35" height="50" fill="#2C3E50" stroke="#4ECDC4" strokeWidth="2" rx="3"/>
                <text x="967" y="160" textAnchor="middle" fill="#4ECDC4" fontSize="8" fontWeight="600">HP</text>
                <text x="967" y="172" textAnchor="middle" fill="#fff" fontSize="7">36K</text>
                <text x="967" y="182" textAnchor="middle" fill="#888" fontSize="6">Outdoor</text>
              </g>

              {/* Refrigerant lines from outdoor unit */}
              <path d="M950 165 L920 165 L920 140 L810 140" stroke="#4ECDC4" strokeWidth="2" strokeDasharray="8,4"/>

              {/* Legend */}
              <g transform="translate(40, 375)">
                <rect width="18" height="12" fill="#fff" rx="2"/>
                <text x="25" y="10" fill="#888" fontSize="9">Mini-Split Head</text>
                
                <path d="M120 6 Q135 12 150 6" stroke="#FF6B6B" strokeWidth="2" fill="none" strokeDasharray="4,3"/>
                <text x="158" y="10" fill="#888" fontSize="9">Radiant Floor Loop</text>
                
                <rect x="270" y="0" width="18" height="12" fill="#FF6B6B" fillOpacity="0.4" stroke="#FF6B6B" strokeDasharray="3,3" rx="2"/>
                <text x="295" y="10" fill="#888" fontSize="9">HRV Filter Location</text>
                
                <rect x="420" y="0" width="15" height="12" fill="#666" stroke="#888" rx="1"/>
                <text x="442" y="10" fill="#888" fontSize="9">Structural Post (Duct Chase)</text>
                
                <rect x="580" y="0" width="18" height="12" fill="#2C3E50" stroke="#4ECDC4" strokeWidth="2" rx="2"/>
                <text x="605" y="10" fill="#888" fontSize="9">Outdoor Heat Pump</text>
              </g>
            </svg>

            {/* Zone Details Panel */}
            {activeZone && zones[activeZone] && (
              <div style={{
                marginTop: '24px',
                padding: '20px',
                background: 'rgba(78, 205, 196, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(78, 205, 196, 0.3)'
              }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#4ECDC4' }}>{zones[activeZone].name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                  <div>
                    <div style={{ color: '#888', fontSize: '12px' }}>Area</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{zones[activeZone].area}</div>
                  </div>
                  <div>
                    <div style={{ color: '#888', fontSize: '12px' }}>Mini-Split</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{zones[activeZone].btu > 0 ? `${zones[activeZone].btu.toLocaleString()} BTU` : 'None'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#888', fontSize: '12px' }}>Heating System</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{zones[activeZone].heating}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ductwork & Ventilation View */}
      {activeView === 'ductwork' && (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600 }}>
              HRV Ductwork & Ventilation Plan
            </h2>
            <p style={{ color: '#888', margin: '0 0 24px 0', fontSize: '14px' }}>
              Fresh air supply via ceiling • Exhaust from baths & kitchen • Filters in kitchen dead space
            </p>

            <svg viewBox="0 0 1000 450" style={{ width: '100%', height: 'auto' }}>
              <defs>
                <marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#74b9ff" />
                </marker>
                <marker id="arrowGray" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#888" />
                </marker>
              </defs>

              {/* House outline */}
              <rect x="30" y="60" width="940" height="320" fill="rgba(255,255,255,0.02)" stroke="#4ECDC4" strokeWidth="2" rx="4"/>

              {/* Room outlines - simplified */}
              <rect x="35" y="65" width="160" height="150" fill="none" stroke="#444" strokeWidth="1" rx="2"/>
              <text x="115" y="140" textAnchor="middle" fill="#666" fontSize="11">Master Bed</text>
              
              <rect x="200" y="65" width="90" height="150" fill="rgba(116,185,255,0.1)" stroke="#74b9ff" strokeWidth="2" rx="2"/>
              <text x="245" y="120" textAnchor="middle" fill="#74b9ff" fontSize="10" fontWeight="600">MECH</text>
              <text x="245" y="135" textAnchor="middle" fill="#74b9ff" fontSize="10" fontWeight="600">ROOM</text>
              
              <rect x="295" y="65" width="200" height="150" fill="none" stroke="#444" strokeWidth="1" rx="2"/>
              <text x="395" y="140" textAnchor="middle" fill="#666" fontSize="11">Living Room</text>
              
              <rect x="500" y="65" width="230" height="150" fill="none" stroke="#444" strokeWidth="1" rx="2"/>
              <text x="615" y="140" textAnchor="middle" fill="#666" fontSize="11">Kitchen</text>
              
              <rect x="735" y="65" width="75" height="90" fill="none" stroke="#444" strokeWidth="1" rx="2"/>
              <text x="772" y="110" textAnchor="middle" fill="#666" fontSize="10">Bath 3</text>
              
              <rect x="735" y="275" width="160" height="100" fill="none" stroke="#444" strokeWidth="1" rx="2"/>
              <text x="815" y="325" textAnchor="middle" fill="#666" fontSize="11">Bedroom 3</text>
              
              <rect x="35" y="275" width="160" height="65" fill="none" stroke="#444" strokeWidth="1" rx="2"/>
              <text x="115" y="315" textAnchor="middle" fill="#666" fontSize="11">Bedroom 2</text>

              {/* Corridor */}
              <rect x="215" y="220" width="520" height="50" fill="rgba(255,255,255,0.02)" stroke="#555" strokeWidth="1" strokeDasharray="5,5"/>
              <text x="475" y="250" textAnchor="middle" fill="#666" fontSize="10">Corridor - Ceiling Duct Chase</text>

              {/* POST location */}
              <rect x="490" y="175" width="15" height="40" fill="#666" stroke="#888" strokeWidth="1"/>
              <text x="497" y="165" textAnchor="middle" fill="#888" fontSize="8">Post</text>

              {/* ===== HRV UNIT in Mechanical Room ===== */}
              <rect x="210" y="75" width="70" height="50" fill="#2C3E50" stroke="#74b9ff" strokeWidth="2" rx="4"/>
              <text x="245" y="95" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600">HRV UNIT</text>
              <text x="245" y="110" textAnchor="middle" fill="#74b9ff" fontSize="8">Panasonic</text>

              {/* ===== FILTER LOCATION in Kitchen Dead Space ===== */}
              <rect x="685" y="70" width="40" height="45" fill="#FF6B6B" fillOpacity="0.3" stroke="#FF6B6B" strokeWidth="2" rx="2"/>
              <text x="705" y="88" textAnchor="middle" fill="#FF6B6B" fontSize="8" fontWeight="600">MERV-13</text>
              <text x="705" y="100" textAnchor="middle" fill="#FF6B6B" fontSize="8" fontWeight="600">FILTERS</text>

              {/* ===== FRESH AIR SUPPLY (Blue) ===== */}
              
              {/* Outside air intake */}
              <line x1="200" y1="100" x2="175" y2="100" stroke="#74b9ff" strokeWidth="3"/>
              <text x="165" y="95" textAnchor="end" fill="#74b9ff" fontSize="9">Fresh</text>
              <text x="165" y="107" textAnchor="end" fill="#74b9ff" fontSize="9">Air In</text>
              
              {/* Main supply duct from HRV through corridor ceiling */}
              <path d="M280 100 L350 100 L350 230 L400 230" stroke="#74b9ff" strokeWidth="4" fill="none"/>
              
              {/* Supply to Living Room */}
              <path d="M400 230 L400 140" stroke="#74b9ff" strokeWidth="3" fill="none" markerEnd="url(#arrowBlue)"/>
              <circle cx="400" cy="130" r="12" fill="none" stroke="#74b9ff" strokeWidth="2"/>
              <text x="400" y="134" textAnchor="middle" fill="#74b9ff" fontSize="8">S</text>
              
              {/* Supply continues through corridor */}
              <path d="M400 230 L700 230" stroke="#74b9ff" strokeWidth="4" fill="none"/>
              
              {/* Supply to Bedroom 3 via post chase */}
              <path d="M500 230 L500 180 L490 180" stroke="#74b9ff" strokeWidth="2" fill="none"/>
              <path d="M500 180 L500 310 L750 310" stroke="#74b9ff" strokeWidth="3" fill="none" markerEnd="url(#arrowBlue)"/>
              <circle cx="760" cy="310" r="12" fill="none" stroke="#74b9ff" strokeWidth="2"/>
              <text x="760" y="314" textAnchor="middle" fill="#74b9ff" fontSize="8">S</text>
              
              {/* Supply to Master Bed */}
              <path d="M350 100 L115 100 L115 140" stroke="#74b9ff" strokeWidth="3" fill="none" markerEnd="url(#arrowBlue)"/>
              <circle cx="115" cy="150" r="12" fill="none" stroke="#74b9ff" strokeWidth="2"/>
              <text x="115" y="154" textAnchor="middle" fill="#74b9ff" fontSize="8">S</text>
              
              {/* Supply to Bedroom 2 */}
              <path d="M300 230 L300 310 L130 310" stroke="#74b9ff" strokeWidth="3" fill="none" markerEnd="url(#arrowBlue)"/>
              <circle cx="120" cy="310" r="12" fill="none" stroke="#74b9ff" strokeWidth="2"/>
              <text x="120" y="314" textAnchor="middle" fill="#74b9ff" fontSize="8">S</text>

              {/* ===== EXHAUST/RETURN (Gray) ===== */}
              
              {/* Kitchen exhaust to filters */}
              <path d="M650 140 L650 85 L685 85" stroke="#888" strokeWidth="3" fill="none" markerEnd="url(#arrowGray)"/>
              <circle cx="640" cy="140" r="10" fill="none" stroke="#888" strokeWidth="2"/>
              <text x="640" y="144" textAnchor="middle" fill="#888" fontSize="8">E</text>
              <text x="640" y="165" textAnchor="middle" fill="#666" fontSize="8">Kitchen</text>
              
              {/* From filters to HRV */}
              <path d="M685 95 L600 95 L600 230 L350 230 L350 125 L280 125" stroke="#888" strokeWidth="4" fill="none"/>
              
              {/* Bath 3 exhaust */}
              <path d="M772 155 L772 180 L700 180 L700 230 L600 230" stroke="#888" strokeWidth="2" fill="none"/>
              <circle cx="772" cy="145" r="10" fill="none" stroke="#888" strokeWidth="2"/>
              <text x="772" y="149" textAnchor="middle" fill="#888" fontSize="8">E</text>
              
              {/* Master Bath exhaust */}
              <path d="M85 220 L85 180 L200 180 L200 230 L350 230" stroke="#888" strokeWidth="2" fill="none"/>
              <circle cx="85" cy="230" r="10" fill="none" stroke="#888" strokeWidth="2"/>
              <text x="85" y="234" textAnchor="middle" fill="#888" fontSize="8">E</text>
              <text x="85" y="255" textAnchor="middle" fill="#666" fontSize="8">M.Bath</text>
              
              {/* Bath 2 exhaust */}
              <path d="M175 260 L175 230 L215 230" stroke="#888" strokeWidth="2" fill="none"/>
              <circle cx="175" cy="270" r="10" fill="none" stroke="#888" strokeWidth="2"/>
              <text x="175" y="274" textAnchor="middle" fill="#888" fontSize="8">E</text>
              <text x="175" y="295" textAnchor="middle" fill="#666" fontSize="8">Bath 2</text>

              {/* Exhaust out */}
              <line x1="200" y1="125" x2="175" y2="125" stroke="#888" strokeWidth="3"/>
              <text x="165" y="120" textAnchor="end" fill="#888" fontSize="9">Stale</text>
              <text x="165" y="132" textAnchor="end" fill="#888" fontSize="9">Air Out</text>

              {/* Legend */}
              <g transform="translate(40, 410)">
                <line x1="0" y1="0" x2="30" y2="0" stroke="#74b9ff" strokeWidth="3"/>
                <text x="38" y="4" fill="#888" fontSize="10">Fresh Air Supply</text>
                
                <circle cx="120" cy="0" r="8" fill="none" stroke="#74b9ff" strokeWidth="2"/>
                <text x="120" y="4" textAnchor="middle" fill="#74b9ff" fontSize="7">S</text>
                <text x="138" y="4" fill="#888" fontSize="10">Supply Diffuser</text>
                
                <line x1="240" y1="0" x2="270" y2="0" stroke="#888" strokeWidth="3"/>
                <text x="278" y="4" fill="#888" fontSize="10">Exhaust/Return</text>
                
                <circle cx="360" cy="0" r="8" fill="none" stroke="#888" strokeWidth="2"/>
                <text x="360" y="4" textAnchor="middle" fill="#888" fontSize="7">E</text>
                <text x="378" y="4" fill="#888" fontSize="10">Exhaust Grille</text>
                
                <rect x="470" y="-8" width="20" height="16" fill="#FF6B6B" fillOpacity="0.3" stroke="#FF6B6B" rx="2"/>
                <text x="498" y="4" fill="#888" fontSize="10">Filter Bank (Kitchen Corner)</text>
              </g>

              {/* Airflow notes */}
              <g transform="translate(750, 400)">
                <text x="0" y="0" fill="#4ECDC4" fontSize="11" fontWeight="500">Design Notes:</text>
                <text x="0" y="15" fill="#888" fontSize="9">• 100 CFM balanced ventilation</text>
                <text x="0" y="28" fill="#888" fontSize="9">• 80% heat recovery efficiency</text>
                <text x="0" y="41" fill="#888" fontSize="9">• Post chase for vertical runs</text>
              </g>
            </svg>

            <div style={{ 
              marginTop: '24px', 
              padding: '16px', 
              background: 'rgba(116,185,255,0.1)', 
              borderRadius: '8px',
              border: '1px solid rgba(116,185,255,0.3)'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#74b9ff' }}>🌬️ Ventilation Strategy</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', color: '#ccc', fontSize: '13px' }}>
                <div>
                  <strong style={{ color: '#74b9ff' }}>Fresh Air Path:</strong><br/>
                  Outside → HRV (mech room) → Corridor ceiling → Supply diffusers in Living, Master, Bed 2, Bed 3
                </div>
                <div>
                  <strong style={{ color: '#888' }}>Exhaust Path:</strong><br/>
                  Kitchen + 3 Baths → Filter bank (kitchen dead space) → HRV → Outside
                </div>
                <div>
                  <strong style={{ color: '#FF6B6B' }}>Filter Location:</strong><br/>
                  MERV-13 filters in kitchen corner dead space — accessible for quarterly changes through cabinet access panel
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mechanical Room View */}
      {activeView === 'mechanical' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600 }}>
              Laundry/Mechanical Room Layout
            </h2>
            <p style={{ color: '#888', margin: '0 0 24px 0', fontSize: '14px' }}>
              Combined laundry + mechanical in ~4.5 m² space • All systems accessible
            </p>

            <svg viewBox="0 0 500 600" style={{ width: '100%', height: 'auto' }}>
              {/* Room outline */}
              <rect x="50" y="50" width="400" height="500" fill="rgba(255,255,255,0.02)" stroke="#4ECDC4" strokeWidth="3" rx="4"/>
              
              {/* Door */}
              <rect x="50" y="450" width="10" height="70" fill="#1a1a2e"/>
              <text x="30" y="490" textAnchor="middle" fill="#888" fontSize="10" transform="rotate(-90, 30, 490)">DOOR</text>

              {/* Stacked Washer/Dryer */}
              <g transform="translate(70, 70)">
                <rect width="80" height="140" fill="#fff" stroke="#666" strokeWidth="2" rx="4"/>
                <line x1="0" y1="70" x2="80" y2="70" stroke="#666" strokeWidth="2"/>
                <circle cx="40" cy="35" r="20" fill="none" stroke="#888" strokeWidth="2"/>
                <circle cx="40" cy="105" r="20" fill="none" stroke="#888" strokeWidth="2"/>
                <text x="40" y="180" textAnchor="middle" fill="#888" fontSize="11" fontWeight="500">Washer/Dryer</text>
                <text x="40" y="195" textAnchor="middle" fill="#666" fontSize="9">24" Stacked</text>
              </g>

              {/* Electrical Panel */}
              <g transform="translate(180, 70)">
                <rect width="90" height="130" fill="#34495E" stroke="#f39c12" strokeWidth="2" rx="4"/>
                <text x="45" y="40" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">ELECTRICAL</text>
                <text x="45" y="58" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">PANEL</text>
                <text x="45" y="80" textAnchor="middle" fill="#f39c12" fontSize="10">200A Main</text>
                <text x="45" y="98" textAnchor="middle" fill="#888" fontSize="9">40 Space</text>
                <rect x="15" y="105" width="60" height="18" fill="#222" stroke="#444" rx="2"/>
              </g>

              {/* LV Drivers */}
              <g transform="translate(290, 70)">
                <rect width="80" height="70" fill="#34495E" stroke="#9b59b6" strokeWidth="2" rx="4"/>
                <text x="40" y="28" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">LV DRIVERS</text>
                <text x="40" y="45" textAnchor="middle" fill="#9b59b6" fontSize="9">24VDC LED</text>
                <text x="40" y="60" textAnchor="middle" fill="#888" fontSize="8">2× 300W</text>
              </g>

              {/* Zone Controller */}
              <g transform="translate(290, 150)">
                <rect width="80" height="55" fill="#34495E" stroke="#9b59b6" strokeWidth="2" rx="4"/>
                <text x="40" y="22" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">TEKMAR</text>
                <text x="40" y="38" textAnchor="middle" fill="#9b59b6" fontSize="9">Zone Ctrl 557</text>
              </g>

              {/* HRV Unit */}
              <g transform="translate(70, 230)">
                <rect width="140" height="90" fill="#34495E" stroke="#74b9ff" strokeWidth="2" rx="4"/>
                <text x="70" y="28" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">HRV UNIT</text>
                <text x="70" y="48" textAnchor="middle" fill="#74b9ff" fontSize="10">Panasonic Intelli-Balance</text>
                <text x="70" y="65" textAnchor="middle" fill="#888" fontSize="9">100 CFM • 80% Recovery</text>
                {/* Duct connections */}
                <rect x="125" y="20" width="20" height="20" fill="#74b9ff" fillOpacity="0.3" stroke="#74b9ff"/>
                <rect x="125" y="50" width="20" height="20" fill="#888" fillOpacity="0.3" stroke="#888"/>
                <text x="158" y="34" fill="#74b9ff" fontSize="8">Supply</text>
                <text x="158" y="64" fill="#888" fontSize="8">Return</text>
              </g>

              {/* Radiant Manifold */}
              <g transform="translate(230, 230)">
                <rect width="150" height="90" fill="#34495E" stroke="#FF6B6B" strokeWidth="2" rx="4"/>
                <text x="75" y="25" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">RADIANT MANIFOLD</text>
                <text x="75" y="45" textAnchor="middle" fill="#FF6B6B" fontSize="10">8-Port + Actuators</text>
                {/* Flow meter indicators */}
                {[0,1,2,3,4,5,6,7].map(i => (
                  <rect key={i} x={15 + i*16} y={55} width="12" height="18" fill="#FF6B6B" fillOpacity="0.4" rx="2"/>
                ))}
                <text x="75" y="88" textAnchor="middle" fill="#888" fontSize="8">Master | Bed2 | Bed3 | Living | Kitchen | Baths | Hall | Entry</text>
              </g>

              {/* Circulation Pump + Expansion */}
              <g transform="translate(70, 340)">
                <rect width="70" height="60" fill="#34495E" stroke="#FF6B6B" strokeWidth="2" rx="4"/>
                <text x="35" y="25" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">PUMP</text>
                <text x="35" y="42" textAnchor="middle" fill="#FF6B6B" fontSize="9">Grundfos</text>
                <text x="35" y="55" textAnchor="middle" fill="#888" fontSize="8">Alpha2</text>
              </g>

              <g transform="translate(150, 340)">
                <rect width="60" height="60" fill="#34495E" stroke="#FF6B6B" strokeWidth="2" rx="4"/>
                <text x="30" y="25" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">EXP</text>
                <text x="30" y="42" textAnchor="middle" fill="#FF6B6B" fontSize="9">Tank</text>
              </g>

              <g transform="translate(220, 340)">
                <rect width="70" height="60" fill="#34495E" stroke="#FF6B6B" strokeWidth="2" rx="4"/>
                <text x="35" y="25" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600">MIXING</text>
                <text x="35" y="42" textAnchor="middle" fill="#FF6B6B" fontSize="9">Valve</text>
                <text x="35" y="55" textAnchor="middle" fill="#888" fontSize="8">Caleffi</text>
              </g>

              {/* Water Filtration */}
              <g transform="translate(70, 420)">
                <rect width="120" height="100" fill="#34495E" stroke="#3498db" strokeWidth="2" rx="4"/>
                <text x="60" y="25" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">WATER</text>
                <text x="60" y="42" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">FILTRATION</text>
                {/* Filter canisters */}
                <ellipse cx="35" cy="70" rx="15" ry="25" fill="#2C3E50" stroke="#3498db"/>
                <ellipse cx="60" cy="70" rx="15" ry="25" fill="#2C3E50" stroke="#3498db"/>
                <ellipse cx="85" cy="70" rx="15" ry="25" fill="#2C3E50" stroke="#3498db"/>
              </g>

              {/* Heat Pump Water Heater */}
              <g transform="translate(210, 420)">
                <rect width="120" height="100" fill="#34495E" stroke="#e74c3c" strokeWidth="2" rx="4"/>
                <text x="60" y="22" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">HEAT PUMP</text>
                <text x="60" y="38" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">WATER HTR</text>
                <text x="60" y="55" textAnchor="middle" fill="#e74c3c" fontSize="9">Rheem ProTerra</text>
                {/* Tank */}
                <ellipse cx="60" cy="78" rx="35" ry="15" fill="#2C3E50" stroke="#e74c3c"/>
                <rect x="25" y="63" width="70" height="30" fill="#2C3E50" stroke="#e74c3c"/>
              </g>

              {/* To outdoor unit */}
              <g transform="translate(340, 340)">
                <rect width="90" height="60" fill="rgba(78,205,196,0.1)" stroke="#4ECDC4" strokeWidth="2" strokeDasharray="5,3" rx="4"/>
                <text x="45" y="22" textAnchor="middle" fill="#4ECDC4" fontSize="9" fontWeight="600">REFRIG</text>
                <text x="45" y="38" textAnchor="middle" fill="#4ECDC4" fontSize="9" fontWeight="600">LINES</text>
                <text x="45" y="52" textAnchor="middle" fill="#888" fontSize="8">→ Outdoor HP</text>
              </g>

              {/* Dimensions */}
              <text x="250" y="35" textAnchor="middle" fill="#888" fontSize="11">~1.8m (6')</text>
              <line x1="50" y1="42" x2="450" y2="42" stroke="#888" strokeWidth="1" strokeDasharray="3,3"/>
              
              <text x="470" y="300" textAnchor="middle" fill="#888" fontSize="11" transform="rotate(90, 470, 300)">~2.5m (8')</text>
              <line x1="458" y1="50" x2="458" y2="550" stroke="#888" strokeWidth="1" strokeDasharray="3,3"/>

              {/* Legend */}
              <g transform="translate(60, 565)">
                <rect width="12" height="12" fill="none" stroke="#f39c12" strokeWidth="2"/>
                <text x="20" y="10" fill="#888" fontSize="9">Electrical</text>
                
                <rect x="85" y="0" width="12" height="12" fill="none" stroke="#3498db" strokeWidth="2"/>
                <text x="105" y="10" fill="#888" fontSize="9">Plumbing</text>
                
                <rect x="165" y="0" width="12" height="12" fill="none" stroke="#FF6B6B" strokeWidth="2"/>
                <text x="185" y="10" fill="#888" fontSize="9">Hydronic</text>
                
                <rect x="245" y="0" width="12" height="12" fill="none" stroke="#74b9ff" strokeWidth="2"/>
                <text x="265" y="10" fill="#888" fontSize="9">Ventilation</text>
                
                <rect x="335" y="0" width="12" height="12" fill="none" stroke="#9b59b6" strokeWidth="2"/>
                <text x="355" y="10" fill="#888" fontSize="9">Controls</text>
              </g>
            </svg>

            <div style={{ 
              marginTop: '24px', 
              padding: '16px', 
              background: 'rgba(255,193,7,0.1)', 
              borderRadius: '8px',
              border: '1px solid rgba(255,193,7,0.3)'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#ffc107' }}>⚡ Installation Notes</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#ccc', fontSize: '13px', lineHeight: '1.8' }}>
                <li>Electrical panel needs 36" clear working space</li>
                <li>HRV unit: ceiling mount preferred for duct access</li>
                <li>Water heater needs 6" side clearance for heat pump air intake</li>
                <li>Manifold at ~36" AFF for easy access and bleeding</li>
                <li>Consider floor drain near water equipment</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Equipment List View */}
      {activeView === 'equipment' && (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600 }}>
              Complete Equipment List
            </h2>
            <p style={{ color: '#888', margin: '0 0 24px 0', fontSize: '14px' }}>
              Recommended equipment for optimal climate control in your 3B-3B modular home
            </p>

            {equipment.map((category, catIndex) => (
              <div key={catIndex} className="equipment-card">
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '16px', 
                  fontWeight: 600,
                  color: '#4ECDC4',
                  borderBottom: '1px solid rgba(78,205,196,0.3)',
                  paddingBottom: '8px'
                }}>
                  {category.category}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 2fr',
                      gap: '16px',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      alignItems: 'start'
                    }}>
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: '4px' }}>{item.name}</div>
                        <div style={{ color: '#4ECDC4', fontSize: '12px', fontFamily: '"IBM Plex Mono", monospace' }}>{item.model}</div>
                      </div>
                      <div style={{ fontSize: '13px', color: '#aaa' }}>{item.specs}</div>
                      <div style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>{item.purpose}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Cost Estimate */}
            <div style={{
              marginTop: '24px',
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(78,205,196,0.1) 0%, rgba(68,160,141,0.1) 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(78,205,196,0.3)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#4ECDC4' }}>💰 Budget Estimate (Equipment Only)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ color: '#888', fontSize: '12px' }}>Heat Pump + Mini-Splits</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>$9,000 - $13,000</div>
                </div>
                <div>
                  <div style={{ color: '#888', fontSize: '12px' }}>Radiant Floor System</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>$3,500 - $5,500</div>
                </div>
                <div>
                  <div style={{ color: '#888', fontSize: '12px' }}>HRV + Ductwork</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>$2,000 - $3,500</div>
                </div>
                <div>
                  <div style={{ color: '#888', fontSize: '12px' }}>Controls & Thermostats</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>$1,200 - $2,000</div>
                </div>
                <div>
                  <div style={{ color: '#888', fontSize: '12px' }}>Water Heater + Filtration</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>$2,500 - $3,500</div>
                </div>
              </div>
              <div style={{ 
                marginTop: '16px', 
                paddingTop: '16px', 
                borderTop: '1px solid rgba(78,205,196,0.3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <span style={{ color: '#888' }}>Equipment Total (before installation)</span>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#4ECDC4' }}>$18,200 - $27,500</span>
              </div>
              <p style={{ color: '#888', fontSize: '12px', marginTop: '12px', marginBottom: 0 }}>
                * Installation labor typically adds 40-80% to equipment costs. Modular pre-installation can reduce this significantly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '32px', 
        padding: '16px',
        color: '#666',
        fontSize: '12px'
      }}>
        Goldilocks Home 3B-3B HVAC System Design • Version 2.0 • Based on Actual Floor Plan
      </div>
    </div>
  );
};

export default HVACSystemDesign;
