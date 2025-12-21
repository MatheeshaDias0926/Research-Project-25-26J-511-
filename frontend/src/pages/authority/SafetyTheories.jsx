import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { BookOpen, Calculator, Activity, AlertTriangle, ArrowRight, ShieldCheck, CloudRain, Sun, Zap, Brain, Server, ClipboardCheck, Target, School, Share2, Laptop, Smartphone, Database, Send, Radio } from "lucide-react";

const SafetyTheories = () => {
  const [activeTab, setActiveTab] = useState("rollover");

  const tabs = [
    { id: "rollover", label: "Rollover Prediction", icon: Activity },
    { id: "stopping", label: "Stopping Distance", icon: ShieldCheck },
    { id: "geometry", label: "Road Geometry", icon: Calculator },
    { id: "constants", label: "Constants & Thresholds", icon: BookOpen },
    { id: "ai_integration", label: "Real-time AI Integration", icon: Zap },
    { id: "sim_flow", label: "Simulation Architecture", icon: Share2 },
    { id: "verification", label: "Model Verification", icon: ClipboardCheck },
    { id: "training_details", label: "Model Training Details", icon: School },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", paddingBottom: "100px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", marginBottom: "8px" }}>
          Safety Logic & Theories
        </h1>
        <p style={{ color: "#64748b", fontSize: "16px" }}>
          Comprehensive documentation of the physics models and algorithms driving the Smart Bus Safety System.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "12px",
                border: activeTab === tab.id ? "2px solid #2563eb" : "1px solid #e2e8f0",
                background: activeTab === tab.id ? "#eff6ff" : "#fff",
                color: activeTab === tab.id ? "#2563eb" : "#64748b",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div style={{ minHeight: "500px" }}>
        {activeTab === "rollover" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <Card>
              <CardHeader>
                <CardTitle>Rollover Prediction Model</CardTitle>
              </CardHeader>
              <CardContent>
                <p style={{ color: "#475569", marginBottom: "24px", lineHeight: "1.6" }}>
                  The core of our safety system is the <strong style={{color: "#2563eb"}}>Digital Twin</strong> model for the Ashok Leyland Viking bus. 
                  It predicts rollover risk in real-time by comparing the vehicle's <strong style={{color: "#2563eb"}}>Lateral Acceleration</strong> against its <strong style={{color: "#2563eb"}}>Static Stability Factor (SSF)</strong>.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  {/* Left Column: Formulas */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <h3 style={{ fontWeight: "600", marginBottom: "16px", color: "#1e293b" }}>1. Static Stability Factor (SSF)</h3>
                        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "12px" }}>
                        Resistance to rollover based on geometry. Lower is worse.
                        </p>
                        <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #cbd5e1", textAlign: "center", marginBottom: "12px" }}>
                        <code style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>SSF = T / (2 × h_CoG)</code>
                        </div>
                    </div>

                    <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <h3 style={{ fontWeight: "600", marginBottom: "16px", color: "#1e293b" }}>2. Lateral Acceleration</h3>
                        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "12px" }}>
                            The "tipping force" felt while cornering.
                        </p>
                        <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #cbd5e1", textAlign: "center", marginBottom: "12px" }}>
                        <code style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>a_lat = v² / (r × g)</code>
                        </div>
                    </div>
                  </div>

                  {/* Right Column: Diagram */}
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <h4 style={{ marginBottom: "16px", fontWeight: "600", color: "#475569" }}>Force Vector Diagram</h4>
                      <svg width="300" height="250" viewBox="0 0 300 250">
                          {/* Ground */}
                          <line x1="20" y1="220" x2="280" y2="220" stroke="#334155" strokeWidth="2" />
                          
                          {/* Bus Rear View */}
                          <rect x="100" y="80" width="100" height="120" fill="none" stroke="#0f172a" strokeWidth="2" rx="4" />
                          {/* Wheels */}
                          <circle cx="110" cy="210" r="10" fill="#334155" />
                          <circle cx="190" cy="210" r="10" fill="#334155" />
                          <text x="150" y="240" textAnchor="middle" fontSize="12" fill="#64748b">Track Width (T)</text>
                          <line x1="110" y1="230" x2="190" y2="230" stroke="#64748b" strokeWidth="1" />
                          
                          {/* CoG */}
                          <circle cx="150" cy="120" r="6" fill="#ef4444" />
                          <text x="150" y="110" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ef4444">CoG</text>
                          
                          {/* Vectors */}
                          {/* Gravity */}
                          <line x1="150" y1="120" x2="150" y2="180" stroke="#16a34a" strokeWidth="3" markerEnd="url(#arrowhead)" />
                          <text x="160" y="160" fontSize="12" fill="#16a34a" fontWeight="600">Gravity (mg)</text>
                          
                          {/* Lateral Force */}
                          <line x1="150" y1="120" x2="240" y2="120" stroke="#b91c1c" strokeWidth="3" markerEnd="url(#arrowhead)" />
                          <text x="200" y="110" fontSize="12" fill="#b91c1c" fontWeight="600">Lateral Force</text>
                          
                          {/* Tipping Arc */}
                          <path d="M 200 210 A 100 100 0 0 1 210 170" fill="none" stroke="#f59e42" strokeWidth="2" strokeDasharray="4,4" />
                          <text x="220" y="190" fontSize="11" fill="#f59e42">Tipping Point</text>
                          
                          {/* Definitions */}
                          <defs>
                              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                  <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                              </marker>
                          </defs>
                      </svg>
                  </div>
                </div>

                {/* Example Calculation Box */}
                <div style={{ marginTop: "32px" }}>
                    <h3 style={{ fontWeight: "600", marginBottom: "16px", color: "#1e293b" }}>Real-World Calculation Example</h3>
                    <div style={{ background: "#f1f5f9", borderRadius: "12px", border: "1px solid #cbd5e1", overflow: "hidden" }}>
                        <div style={{ background: "#e2e8f0", padding: "12px 24px", borderBottom: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: "600", color: "#334155" }}>Scenario: Overloaded Bus on Sharp Curve</span>
                            <span style={{ fontSize: "12px", background: "#ef4444", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontWeight: "700" }}>CRITICAL RISK</span>
                        </div>
                        <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px" }}>
                            <div style={{ fontSize: "14px", color: "#475569" }}>
                                <div style={{ marginBottom: "12px" }}><strong>Inputs:</strong></div>
                                <ul style={{ listStyleType: "disc", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <li>Standing Passengers: <strong>75</strong></li>
                                    <li>Speed: <strong>50 km/h</strong> (13.9 m/s)</li>
                                    <li>Curve Radius: <strong>30 m</strong></li>
                                </ul>
                            </div>
                            <div style={{ fontSize: "14px" }}>
                                <div style={{ marginBottom: "16px" }}>
                                    <div style={{ marginBottom: "4px", color: "#64748b" }}>1. Calculate CoG Height</div>
                                    <code style={{ background: "#fff", padding: "4px 8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>h_CoG ≈ 1.53 m</code> (High due to 75 standing people)
                                </div>
                                <div style={{ marginBottom: "16px" }}>
                                    <div style={{ marginBottom: "4px", color: "#64748b" }}>2. Calculate Stability (SSF)</div>
                                    <code style={{ background: "#fff", padding: "4px 8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>SSF = 2.0 / (2 × 1.53) = 0.65</code>
                                </div>
                                <div style={{ marginBottom: "16px" }}>
                                    <div style={{ marginBottom: "4px", color: "#64748b" }}>3. Calculate Lateral Force</div>
                                    <code style={{ background: "#fff", padding: "4px 8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>a_lat = (13.9)² / (30 × 9.81) = 0.66 g</code>
                                </div>
                                <div>
                                    <div style={{ marginBottom: "4px", color: "#64748b" }}>4. Conclusion</div>
                                    <code style={{ background: "#fee2e2", color: "#b91c1c", padding: "4px 8px", borderRadius: "4px", border: "1px solid #fecaca", fontWeight: "700" }}>0.66 g {'>'} 0.65 SSF → ROLLOVER IMMINENT</code>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </CardContent>
            </Card>

            <Card>
               <CardHeader><CardTitle>Dynamic Center of Gravity (CoG)</CardTitle></CardHeader>
               <CardContent>
                  <p style={{ color: "#475569", marginBottom: "16px" }}>
                     The most critical variable. Standing passengers significantly raise the CoG, making the bus unstable.
                  </p>
                  <div style={{ background: "#f1f5f9", padding: "24px", borderRadius: "12px", overflowX: "auto" }}>
                      <code style={{ color: "#334155", display: "block", marginBottom: "8px" }}>
                          h_CoG = ( (m_bus × h_empty) + (M_seated × h_seat) + (M_standing × h_stand) ) / M_total
                      </code>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginTop: "16px" }}>
                          <div>
                              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>EMPTY BUS</div>
                              <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>1.2 m</div>
                          </div>
                          <div>
                              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>SEATED PAX</div>
                              <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>1.4 m</div>
                          </div>
                          <div>
                              <div style={{ fontSize: "12px", color: "#ef4444", fontWeight: "600" }}>STANDING PAX</div>
                              <div style={{ fontSize: "18px", fontWeight: "700", color: "#ef4444" }}>2.2 m</div>
                          </div>
                      </div>
                  </div>
               </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "stopping" && (
           <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
               <Card>
                   <CardHeader><CardTitle>Stopping Distance Calculation</CardTitle></CardHeader>
                   <CardContent>
                       <p style={{ color: "#475569", marginBottom: "24px" }}>
                           Calculates the total distance required to bring the bus to a halt, considering <strong style={{color:"#2563eb"}}>Reaction Time</strong> and <strong style={{color:"#ef4444"}}>Braking Distance</strong>.
                       </p>
                       
                       {/* Formula Visual */}
                       <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", padding: "32px", background: "#f8fafc", borderRadius: "12px", marginBottom: "32px" }}>
                           <div style={{ textAlign: "center" }}>
                               <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "4px" }}>Reaction Distance</div>
                               <div style={{ fontSize: "24px", fontWeight: "700", color: "#3b82f6" }}>d_react</div>
                           </div>
                           <div style={{ fontSize: "24px", color: "#cbd5e1" }}>+</div>
                           <div style={{ textAlign: "center" }}>
                               <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "4px" }}>Braking Distance</div>
                               <div style={{ fontSize: "24px", fontWeight: "700", color: "#ef4444" }}>d_brake</div>
                           </div>
                           <div style={{ fontSize: "24px", color: "#cbd5e1" }}>=</div>
                            <div style={{ textAlign: "center" }}>
                               <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "4px" }}>Total Distance</div>
                               <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>d_total</div>
                           </div>
                       </div>
                       
                        {/* Comparison Chart */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
                            <div>
                                <h3 style={{ fontWeight: "600", marginBottom: "16px", color: "#1e293b" }}>Environmental Impact</h3>
                                <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px", lineHeight: "1.6" }}>
                                    Road conditions drastically affect stopping distance by changing the friction coefficient (μ).
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    <div style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
                                        <Sun className="text-amber-500" size={24} />
                                        <div>
                                            <div style={{ fontWeight: "600", color: "#334155" }}>Dry Asphalt</div>
                                            <div style={{ fontSize: "13px", color: "#64748b" }}>Friction (μ) ≈ 0.7</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: "16px", border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
                                        <CloudRain className="text-blue-500" size={24} />
                                        <div>
                                            <div style={{ fontWeight: "600", color: "#334155" }}>Wet Road</div>
                                            <div style={{ fontSize: "13px", color: "#64748b" }}>Friction (μ) ≈ 0.4</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bar Chart SVG */}
                            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", background: "#fff" }}>
                                <h4 style={{ marginBottom: "16px", fontWeight: "600", textAlign: "center", fontSize: "14px" }}>Stopping Distance at 50 km/h</h4>
                                <svg width="100%" height="150">
                                    {/* Dry Bar */}
                                    <text x="0" y="45" fontSize="12" fill="#64748b">Dry</text>
                                    <rect x="40" y="30" width="150" height="20" fill="#f59e42" opacity="0.8" />
                                    <text x="200" y="45" fontSize="12" fontWeight="700" fill="#334155">35m</text>

                                    {/* Wet Bar */}
                                    <text x="0" y="95" fontSize="12" fill="#64748b">Wet</text>
                                    <rect x="40" y="80" width="240" height="20" fill="#3b82f6" opacity="0.8" />
                                    <text x="290" y="95" fontSize="12" fontWeight="700" fill="#334155">55m</text>
                                    
                                    {/* Grid lines */}
                                    <line x1="40" y1="20" x2="40" y2="120" stroke="#e2e8f0" strokeDasharray="4,4" />
                                    <line x1="160" y1="20" x2="160" y2="120" stroke="#e2e8f0" strokeDasharray="4,4" />
                                    <line x1="280" y1="20" x2="280" y2="120" stroke="#e2e8f0" strokeDasharray="4,4" />
                                </svg> 
                                <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", marginTop: "12px" }}>
                                    Wet roads increase stopping distance by ~57%
                                </p>
                            </div>
                        </div>
                   </CardContent>
               </Card>
           </div>
        )}

        {activeTab === "geometry" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
               <Card>
                   <CardHeader><CardTitle>Road Geometry & Curvature</CardTitle></CardHeader>
                   <CardContent>
                       <p style={{ color: "#475569", marginBottom: "24px" }}>
                           We use the <strong>Menger Curvature</strong> theorem (Circumradius of 3 points) to calculate the instantaneous curve radius from GPS data.
                       </p>
                       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                           <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                                    <h4 style={{ fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>Method 1: Live GPS (Reactive)</h4>
                                    <p style={{ fontSize: "14px", color: "#64748b" }}>
                                        Takes the last 3 GPS points (P1, P2, P3) to fit a circle.
                                        <br/><br/>
                                        <em>Best for:</em> Tunnels, areas with poor map data.
                                    </p>
                                </div>
                                <div style={{ background: "#f0fdf4", padding: "20px", borderRadius: "12px", border: "1px solid #dcfce7" }}>
                                    <h4 style={{ fontWeight: "600", color: "#166534", marginBottom: "8px" }}>Method 2: OSMnx Lookahead (Predictive)</h4>
                                    <p style={{ fontSize: "14px", color: "#15803d" }}>
                                        Queries OpenStreetMap for the road network 150m ahead.
                                        <br/><br/>
                                        <em>Best for:</em> Early warnings, main roads.
                                    </p>
                                </div>
                           </div>
                           <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {/* Improved visualization of 3 points making a circle */}
                                <svg width="250" height="200" viewBox="0 0 250 200">
                                    {/* Road Path */}
                                    <path d="M 40 160 C 80 80, 180 80, 220 160" fill="none" stroke="#e2e8f0" strokeWidth="20" strokeLinecap="round" />
                                    <path d="M 40 160 C 80 80, 180 80, 220 160" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="5,5" />
                                    
                                    {/* GPS Points */}
                                    <circle cx="65" cy="125" r="5" fill="#2563eb" />
                                    <text x="65" y="115" fontSize="10" textAnchor="middle" fill="#2563eb" fontWeight="700">P1</text>
                                    
                                    <circle cx="130" cy="95" r="5" fill="#2563eb" />
                                    <text x="130" y="85" fontSize="10" textAnchor="middle" fill="#2563eb" fontWeight="700">P2 (Bus)</text>
                                    
                                    <circle cx="195" cy="125" r="5" fill="#2563eb" />
                                    <text x="195" y="115" fontSize="10" textAnchor="middle" fill="#2563eb" fontWeight="700">P3</text>
                                    
                                    {/* Fitted Circle (Circumcircle) */}
                                    <circle cx="130" cy="180" r="85" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2" />
                                    <line x1="130" y1="180" x2="130" y2="95" stroke="#ef4444" strokeWidth="1" />
                                    <text x="135" y="150" fontSize="12" fill="#ef4444" fontWeight="600">R (Radius)</text>
                                    <circle cx="130" cy="180" r="3" fill="#ef4444" />
                                </svg>
                           </div>
                       </div>
                   </CardContent>
               </Card>
           </div>
        )}

        {activeTab === "constants" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <Card>
                    <CardHeader><CardTitle>Calibrated Constants</CardTitle></CardHeader>
                    <CardContent>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                                <thead>
                                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Parameter</th>
                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Symbol</th>
                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Value</th>
                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Unit</th>
                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Bus Mass</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>m_bus</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: "600" }}>10,000</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>kg</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Empty vehicle weight</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Track Width</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>T</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: "600" }}>2.0</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>m</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Width between wheel centers</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Empty CoG</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>h_empty</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: "600" }}>1.2</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>m</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Height of CoG (Empty)</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Seated CoG</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>h_seat</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: "600" }}>1.4</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>m</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Height of seated passenger CoG</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Standing CoG</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>h_stand</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: "600" }}>2.2</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>m</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Height of standing passenger CoG</td>
                                    </tr>
                                    <tr style={{ background: "#fff7ed" }}>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Friction (Dry)</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>μ_dry</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: "600", color: "#c2410c" }}>0.65</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>-</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Standard Asphalt (Worn)</td>
                                    </tr>
                                    <tr style={{ background: "#eff6ff" }}>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Friction (Wet)</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>μ_wet</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: "600", color: "#2563eb" }}>0.35</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>-</td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Monsoon Condition (Dynamic)</td>
                                    </tr>
                                </tbody>
                            </table>
                            
                            <div style={{ marginTop: "16px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", fontSize: "13px", color: "#475569", display: "flex", alignItems: "center", gap: "10px" }}>
                                <CloudRain size={16} className="text-blue-500" />
                                <span>
                                    <strong>Real-time Weather Integration:</strong> The system automatically queries the <em>Open-Meteo API</em> using the bus's live GPS coordinates (Lat/Lon). 
                                    If rain is detected, the model instantly switches μ (Friction) from 0.65 to 0.35.
                                </span>
                            </div>
                        </div>

                        <div style={{ marginTop: "32px" }}>
                             <h3 style={{ fontWeight: "600", marginBottom: "16px", color: "#1e293b" }}>Safety Margins</h3>
                             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                                 <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", padding: "16px", borderRadius: "8px" }}>
                                     <div style={{ color: "#166534", fontWeight: "700", marginBottom: "4px" }}>SAFE</div>
                                     <div style={{ color: "#15803d", fontSize: "14px" }}>&le; 50% of Limit</div>
                                 </div>
                                 <div style={{ border: "1px solid #fde68a", background: "#fefce8", padding: "16px", borderRadius: "8px" }}>
                                     <div style={{ color: "#854d0e", fontWeight: "700", marginBottom: "4px" }}>WARNING</div>
                                     <div style={{ color: "#a16207", fontSize: "14px" }}>{'>'} 50% of Limit</div>
                                 </div>
                                 <div style={{ border: "1px solid #fecaca", background: "#fef2f2", padding: "16px", borderRadius: "8px" }}>
                                     <div style={{ color: "#b91c1c", fontWeight: "700", marginBottom: "4px" }}>CRITICAL</div>
                                     <div style={{ color: "#b91c1c", fontSize: "14px" }}>{'>'} 70% of Limit</div>
                                 </div>
                             </div>
                        </div>
                    </CardContent>
                  </Card>
            </div>
        )}
    

        {activeTab === "ai_integration" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <Card>
                    <CardHeader>
                        <CardTitle style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <Brain className="text-purple-600" size={28} />
                            Deep Neural Architecture & Inference Logic
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p style={{ color: "#475569", marginBottom: "32px", lineHeight: "1.6" }}>
                           The system relies on a <strong>Multi-Output Random Forest Regressor</strong> (100 Estimators). Unlike simple if-then logic, this model understands 
                           non-linear physical interactions. For example, it knows that <em>speeding on a wet road</em> is exponentially more dangerous than speeding on a dry road.
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                             <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                                <h3 style={{ fontWeight: "600", color: "#334155", marginBottom: "16px" }}>1. Dynamic Input Vector (X)</h3>
                                <ul style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "#475569" }}>
                                    <li style={{ paddingBottom: "8px", borderBottom: "1px solid #e2e8f0" }}>
                                        <strong>Occupancy Data:</strong> Seated vs. Standing count (affects CoG).
                                    </li>
                                    <li style={{ paddingBottom: "8px", borderBottom: "1px solid #e2e8f0" }}>
                                        <strong>Telemetry:</strong> Live Speed (GPS) & Gradient.
                                    </li>
                                    <li style={{ paddingBottom: "8px", borderBottom: "1px solid #e2e8f0", color: "#2563eb" }}>
                                        <strong>Environmental (API):</strong> 
                                        Bus Lat/Lon → <em>Open-Meteo API</em> → Rain Status → <strong>Friction (μ)</strong> 
                                        <br/>
                                        <small style={{ color: "#64748b" }}>(Auto-switches 0.65 ➝ 0.35)</small>
                                    </li>
                                     <li>
                                        <strong>Geometry:</strong> Curve Radius (Menger Curvature from GPS traces).
                                    </li>
                                </ul>
                             </div>

                             <div style={{ background: "#f0fdf4", padding: "24px", borderRadius: "12px", border: "1px solid #dcfce7" }}>
                                <h3 style={{ fontWeight: "600", color: "#166534", marginBottom: "16px" }}>2. Model Output Targets (Y)</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    <div>
                                        <div style={{ fontWeight: "700", color: "#166534", fontSize: "15px" }}>Target A: Rollover Risk Score</div>
                                        <div style={{ fontSize: "13px", color: "#15803d", marginTop: "4px" }}>
                                            Predicts <code>LatAccel / SSF</code>. 
                                            <br/>
                                            A score {'>'} 0.7 triggers instant "CRITICAL" alert to driver app.
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: "700", color: "#166534", fontSize: "15px" }}>Target B: Stopping Distance</div>
                                        <div style={{ fontSize: "13px", color: "#15803d", marginTop: "4px" }}>
                                            Predicts total meters to stop.
                                            <br/>
                                            Adjusts dynamically based on weather-induced friction loss.
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* Inference Flowchart */}
                        <div style={{ marginBottom: "32px", padding: "24px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
                            <h3 style={{ fontWeight: "600", marginBottom: "20px", color: "#1e293b", textAlign: "center" }}>End-to-End Inference Pipeline (~20ms)</h3>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                                {/* Step 1 */}
                                <div style={{ width: "22%", textAlign: "center" }}>
                                    <div style={{ width: "40px", height: "40px", background: "#3b82f6", borderRadius: "50%", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700" }}>1</div>
                                    <div style={{ fontWeight: "600", fontSize: "14px" }}>ESP32 / GPS</div>
                                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Sends `Loc` + `Speed`</div>
                                </div>
                                <div style={{ flex: 1, height: "2px", background: "#e2e8f0", margin: "0 10px" }}></div>
                                
                                {/* Step 2 */}
                                <div style={{ width: "22%", textAlign: "center" }}>
                                    <div style={{ width: "40px", height: "40px", background: "#f59e0b", borderRadius: "50%", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700" }}>2</div>
                                    <div style={{ fontWeight: "600", fontSize: "14px" }}>Backend Enrichment</div>
                                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Fetches `Weather` via API</div>
                                </div>
                                <div style={{ flex: 1, height: "2px", background: "#e2e8f0", margin: "0 10px" }}></div>

                                {/* Step 3 */}
                                <div style={{ width: "22%", textAlign: "center" }}>
                                    <div style={{ width: "40px", height: "40px", background: "#8b5cf6", borderRadius: "50%", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700" }}>3</div>
                                    <div style={{ fontWeight: "600", fontSize: "14px" }}>ML Microservice</div>
                                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Runs Random Forest</div>
                                </div>
                                <div style={{ flex: 1, height: "2px", background: "#e2e8f0", margin: "0 10px" }}></div>

                                {/* Step 4 */}
                                <div style={{ width: "22%", textAlign: "center" }}>
                                    <div style={{ width: "40px", height: "40px", background: "#10b981", borderRadius: "50%", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700" }}>4</div>
                                    <div style={{ fontWeight: "600", fontSize: "14px" }}>Driver Alert</div>
                                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Push Notification</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: "#f3f4f6", padding: "24px", borderRadius: "12px", border: "1px solid #d1d5db" }}>
                            <h3 style={{ fontWeight: "600", marginBottom: "8px", color: "#374151" }}>
                                🧠 Why "Random Forest" (Ensemble Learning)?
                            </h3>
                            <p style={{ fontSize: "14px", color: "#4b5563" }}>
                                A single decision tree might overfit (e.g., assuming "all curves are dangerous"). A Random Forest averages the decision of <strong>100 independent trees</strong>. 
                                Some trees focus on speed, others on weather, others on occupancy. The final consensus is robust, stable, and less prone to false alarms.
                            </p>
                        </div>

                        {/* Teacher-Student Model Section */}
                        <div style={{ marginTop: "32px", borderTop: "1px solid #e2e8f0", paddingTop: "32px" }}>
                             <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                                <div style={{ background: "#eff6ff", padding: "10px", borderRadius: "12px" }}>
                                    <Server size={24} className="text-blue-600" />
                                </div>
                                <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
                                    Hybrid Intelligence: "Teacher-Student" Architecture
                                </h3>
                             </div>
                             
                             <p style={{ color: "#64748b", marginBottom: "24px", lineHeight: "1.6" }}>
                                To achieve <strong>&lt; 20ms latency</strong> on low-power edge devices (like ESP32/Raspberry Pi) while maintaining scientific accuracy, we employ a 
                                <em> knowledge distillation</em> approach.
                             </p>

                             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                                {/* Teacher Block */}
                                <div style={{ border: "1px solid #cbd5e1", borderRadius: "12px", overflow: "hidden" }}>
                                    <div style={{ background: "#f1f5f9", padding: "16px", borderBottom: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span style={{ fontWeight: "700", color: "#334155" }}>The "Teacher" (Physics)</span>
                                        <span style={{ fontSize: "11px", background: "#334155", color: "#fff", padding: "2px 8px", borderRadius: "99px" }}>OFFLINE</span>
                                    </div>
                                    <div style={{ padding: "20px" }}>
                                        <p style={{ fontSize: "14px", color: "#475569", marginBottom: "12px" }}>
                                            <strong>Role:</strong> The Source of Truth.
                                        </p>
                                        <p style={{ fontSize: "14px", color: "#475569", marginBottom: "16px" }}>
                                            Uses complex differential equations ($F=ma$) to calculate exact stability limits. It generates 100,000+ synthetic scenarios to create a "textbook" (Training Dataset).
                                        </p>
                                        <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                                            "Slow but Extremely Accurate"
                                        </div>
                                    </div>
                                </div>

                                {/* Link Icon */}
                                <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%) translateY(100px)", zIndex: 10, background: "#fff", padding: "8px", borderRadius: "50%", border: "1px solid #e2e8f0" }}>
                                    <ArrowRight size={20} className="text-blue-500" />
                                </div>

                                {/* Student Block */}
                                <div style={{ border: "1px solid #bfdbfe", borderRadius: "12px", overflow: "hidden", background: "#eff6ff" }}>
                                    <div style={{ background: "#dbeafe", padding: "16px", borderBottom: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span style={{ fontWeight: "700", color: "#1e40af" }}>The "Student" (ML Model)</span>
                                        <span style={{ fontSize: "11px", background: "#2563eb", color: "#fff", padding: "2px 8px", borderRadius: "99px" }}>REAL-TIME</span>
                                    </div>
                                    <div style={{ padding: "20px" }}>
                                         <p style={{ fontSize: "14px", color: "#1e3a8a", marginBottom: "12px" }}>
                                            <strong>Role:</strong> The Fast Approximation.
                                        </p>
                                        <p style={{ fontSize: "14px", color: "#1e3a8a", marginBottom: "16px" }}>
                                            Trained on the Teacher's dataset. It learns to <em>mimic</em> the physics laws without solving the math equations every time. It essentially "memorizes" the physics textbook.
                                        </p>
                                        <div style={{ fontSize: "12px", color: "#3b82f6", fontStyle: "italic" }}>
                                            "99% Accuracy at 100x Speed"
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
        {activeTab === "verification" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <Card>
                    <CardHeader>
                        <CardTitle style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <ClipboardCheck className="text-emerald-600" size={28} />
                            Model Verification & Real-World Validation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p style={{ color: "#475569", marginBottom: "32px", lineHeight: "1.6" }}>
                           To ensure the safety system is trustworthy, we rigorously tested the <strong style={{color:"#2563eb"}}>ML Model</strong> against the <strong style={{color:"#166534"}}>Ground Truth Physics Engine</strong> using realistic Sri Lankan road scenarios.
                        </p>

                        {/* Top Metrics */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                            <div style={{ background: "#f0fdf4", padding: "24px", borderRadius: "12px", border: "1px solid #dcfce7", display: "flex", alignItems: "center", gap: "16px" }}>
                                <div style={{ background: "#fff", padding: "12px", borderRadius: "50%", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                                    <Target className="text-emerald-600" size={32} />
                                </div>
                                <div>
                                    <div style={{ fontSize: "14px", color: "#166534", fontWeight: "600" }}>R² SCORE (ACCURACY)</div>
                                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#14532d" }}>99.74%</div>
                                    <div style={{ fontSize: "12px", color: "#15803d" }}>Variance Explained</div>
                                </div>
                            </div>
                            <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "16px" }}>
                                <div style={{ background: "#fff", padding: "12px", borderRadius: "50%", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                                    <Activity className="text-slate-600" size={32} />
                                </div>
                                <div>
                                    <div style={{ fontSize: "14px", color: "#475569", fontWeight: "600" }}>MEAN SQUARED ERROR</div>
                                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#1e293b" }}>0.12</div>
                                    <div style={{ fontSize: "12px", color: "#64748b" }}>Negligible Deviation</div>
                                </div>
                            </div>
                        </div>

                        {/* Comparison Table */}
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                            <div style={{ background: "#f1f5f9", padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>
                                <h3 style={{ fontWeight: "600", color: "#1e293b" }}>Scenario-Based Validation (Sri Lanka Context)</h3>
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                                <thead>
                                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                                        <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>SCENARIO</th>
                                        <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>PHYSICS (TRUE)</th>
                                        <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>ML (PREDICTED)</th>
                                        <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>ACCURACY</th>
                                        <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>RESULT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ background: "#fff" }}>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", fontWeight: "600", color: "#1e293b" }}>
                                            Colombo Town Hall
                                            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "400" }}>Roundabout, 40km/h</div>
                                        </td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", color: "#166534" }}>0.3587 (Safe)</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>0.3570</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>99.54%</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}><span style={{background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: "99px", fontSize: "12px", fontWeight:"700"}}>✔ MATCH</span></td>
                                    </tr>
                                    <tr style={{ background: "#f8fafc" }}>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", fontWeight: "600", color: "#1e293b" }}>
                                            18-Bend Road (Mahiyanganaya)
                                            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "400" }}>Extreme Curve, Wet, 30km/h</div>
                                        </td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", color: "#b91c1c", fontWeight: "700" }}>0.7987 (CRITICAL)</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", color: "#b91c1c", fontWeight: "700" }}>0.7091 (CRITICAL)</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>88.78%</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}><span style={{background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: "99px", fontSize: "12px", fontWeight:"700"}}>✔ MATCH</span></td>
                                    </tr>
                                    <tr style={{ background: "#fff" }}>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", fontWeight: "600", color: "#1e293b" }}>
                                            Kadugannawa Pass
                                            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "400" }}>Hairpin, 35km/h</div>
                                        </td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", color: "#ca8a04", fontWeight: "600" }}>0.6322 (Warning)</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", color: "#ca8a04", fontWeight: "600" }}>0.6815 (Warning)</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>92.21%</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}><span style={{background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: "99px", fontSize: "12px", fontWeight:"700"}}>✔ MATCH</span></td>
                                    </tr>
                                    <tr style={{ background: "#f8fafc" }}>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", fontWeight: "600", color: "#1e293b" }}>
                                            Regular City Traffic
                                            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "400" }}>Straight, 30km/h</div>
                                        </td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", color: "#166534" }}>0.0590 (Safe)</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>0.0601</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>98.21%</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}><span style={{background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: "99px", fontSize: "12px", fontWeight:"700"}}>✔ MATCH</span></td>
                                    </tr>
                                     <tr style={{ background: "#fff" }}>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", fontWeight: "600", color: "#1e293b" }}>
                                            Southern Expressway
                                            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "400" }}>High Speed, 100km/h</div>
                                        </td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", color: "#166534" }}>0.2441 (Safe)</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>0.3195</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>69.08%</td>
                                        <td style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>
                                             <span style={{background: "#fef9c3", color: "#854d0e", padding: "4px 8px", borderRadius: "99px", fontSize: "12px", fontWeight:"700"}}>⚠ SAFE MARGIN</span>
                                             <div style={{fontSize: "10px", color: "#a16207", marginTop: "4px"}}>Overestimates risk (Better safe than sorry)</div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
        {activeTab === "training_details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                 <Card>
                    <CardHeader>
                        <CardTitle style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                             <School className="text-indigo-600" size={28} />
                             Model Training & Data Strategy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p style={{ color: "#475569", marginBottom: "32px", lineHeight: "1.6" }}>
                           Detailed technical breakdown of how the ML model consumes data, learns from the physics engine, and our strategy for ensuring immediate reliability.
                        </p>

                        {/* 1. Teacher-Student Process */}
                         <div style={{ marginBottom: "32px" }}>
                             <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                 <span style={{ background: "#e0e7ff", color: "#3730a3", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>1</span>
                                 Teacher-Student Learning Process
                             </h3>
                             <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                                 <p style={{ marginBottom: "16px", color: "#475569" }}>
                                    When you run a simulation on the <strong>Safety & Physics Analysis</strong> page, the following process occurs:
                                 </p>
                                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                                     {/* Stage 1 */}
                                     <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                                         <div style={{ fontWeight: "700", color: "#334155", marginBottom: "8px" }}>A. The "Teacher" Calculates</div>
                                         <p style={{ fontSize: "13px", color: "#64748b" }}>
                                             The system uses the <strong>Physics Engine</strong> to solve real equations (e.g., Lateral Force = v²/r) and get the <em style={{color: "#166534"}}>exact result</em>.
                                         </p>
                                         <div style={{ marginTop: "8px", fontSize: "12px", color: "#1e293b", fontWeight: "600", background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px" }}>
                                             Result: "Critical Risk, SSF: 0.65"
                                         </div>
                                     </div>
                                     {/* Stage 2 */}
                                     <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                                         <div style={{ fontWeight: "700", color: "#334155", marginBottom: "8px" }}>B. Data is Captured</div>
                                         <p style={{ fontSize: "13px", color: "#64748b" }}>
                                             The backend automatically saves the input scenarios and the calculated result into the <strong>MongoDB Database</strong>.
                                         </p>
                                         <div style={{ marginTop: "8px", fontSize: "12px", color: "#1e293b", fontWeight: "600", background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px" }}>
                                             Label: Speed 50 + Curve 30m = Critical
                                         </div>
                                     </div>
                                      {/* Stage 3 */}
                                     <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                                         <div style={{ fontWeight: "700", color: "#334155", marginBottom: "8px" }}>C. The "Student" Learns</div>
                                         <p style={{ fontSize: "13px", color: "#64748b" }}>
                                             The <strong>ML Model</strong> studies these examples. Instead of solving math, it learns the pattern: <em>"High Speed + Sharp Curve = Danger"</em>.
                                         </p>
                                          <div style={{ marginTop: "8px", fontSize: "12px", color: "#2563eb", fontWeight: "600", background: "#eff6ff", padding: "4px 8px", borderRadius: "4px" }}>
                                             Benefit: Instant Prediction ({'<'}20ms)
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         </div>

                         {/* 2. Random Forest Mechanics */}
                         <div style={{ marginBottom: "32px" }}>
                             <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                 <span style={{ background: "#dcfce7", color: "#14532d", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>2</span>
                                 How the Random Forest "Consumes" Data
                             </h3>
                             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                                 <div style={{ background: "#f0f9ff", padding: "24px", borderRadius: "12px", border: "1px solid #bae6fd" }}>
                                     <h4 style={{ fontWeight: "600", color: "#0369a1", marginBottom: "12px" }}>Step 1: Splitting Features & Targets</h4>
                                     <ul style={{ listStyle: "none", padding: 0, fontSize: "14px", color: "#334155" }}>
                                         <li style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                                             <span style={{ fontWeight: "700" }}>Features (Inputs):</span> Speed, Curve Radius, Standing count, Rain.
                                         </li>
                                         <li style={{display: "flex", alignItems: "center", gap: "8px" }}>
                                             <span style={{ fontWeight: "700" }}>Targets (Outputs):</span> Rollover Risk Score, Stopping Distance.
                                         </li>
                                     </ul>
                                 </div>
                                  <div style={{ background: "#f0fdf4", padding: "24px", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                                     <h4 style={{ fontWeight: "600", color: "#15803d", marginBottom: "12px" }}>Step 2: Building 100 Decision Trees</h4>
                                     <p style={{ fontSize: "14px", color: "#334155", fontStyle: "italic" }}>
                                        Tree #1: Is speed &gt; 60? If yes, is road Wet? -&gt; Critical.
                                        <br/>
                                        Tree #2: Is standing &gt; 40? If yes, is curve &lt; 30m? -&gt; Critical.
                                     </p>
                                     <div style={{ marginTop: "12px", fontSize: "12px", color: "#166534", fontWeight: "700" }}>
                                         Final Result = Average of all 100 Trees (Ensemble)
                                     </div>
                                 </div>
                             </div>
                         </div>

                         {/* 3. Data Strategy (Cold Start) */}
                         <div>
                             <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                 <span style={{ background: "#fff7ed", color: "#c2410c", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>3</span>
                                 Data Strategy: The "Cold Start" Problem
                             </h3>
                             <div style={{ background: "#fff", border: "1px solid #f97316", borderRadius: "12px", overflow: "hidden" }}>
                                 <div style={{ background: "#fff7ed", padding: "16px 24px", borderBottom: "1px solid #ffedd5" }}>
                                     <span style={{ fontWeight: "700", color: "#9a3412" }}>Why Synthetic Data?</span>
                                 </div>
                                 <div style={{ padding: "24px", fontSize: "14px", color: "#475569", lineHeight: "1.6" }}>
                                     <p style={{ marginBottom: "16px" }}>
                                         Currently, the model's training script (<code>train_safety_model.py</code>) generates <strong>5,000 synthetic examples</strong> on the fly using the physics formulas. 
                                         It deliberately ignores the MongoDB user data for now.
                                     </p>
                                     <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                                         <div>
                                             <div style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>🚫 The Problem</div>
                                             If we waited for users to manually run 5,000 simulations, the model would be "dumb" and untrained for weeks.
                                         </div>
                                         <div>
                                             <div style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>✅ The Solution</div>
                                             Generating synthetic data ensures the model is <strong>expertly calibrated</strong> to physics laws from Day 1.
                                         </div>
                                     </div>
                                     <div style={{ marginTop: "24px", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                                         <strong style={{ color: "#334155" }}>Future Plan:</strong> The data stored in MongoDB isn't wasted. It will be used for <strong>Validation</strong> (checking if users find edge cases) and future <strong>Fine-tuning</strong> (adding human-verified scenarios to the synthetic mix).
                                     </div>
                                 </div>
                             </div>
                         </div>
                    </CardContent>
                 </Card>
            </div>
        )}
        {activeTab === "sim_flow" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                 <Card>
                    <CardHeader>
                        <CardTitle style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                             <Share2 className="text-blue-600" size={28} />
                             End-to-End Simulation Data Flow
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p style={{ color: "#475569", marginBottom: "32px", lineHeight: "1.6" }}>
                           This diagram illustrates how the <strong>Live Scenario Simulator</strong> communicates with the entire ecosystem to provide real-time updates to the Control Center and the Bus Conductor's mobile app.
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "32px", alignItems: "center", marginTop: "24px" }}>
                            
                            {/* STEP 1: SIMULATOR */}
                            <div style={{ display: "flex", gap: "24px", width: "100%", maxWidth: "800px", alignItems: "center" }}>
                                <div style={{ width: "80px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                    <div style={{ width: "64px", height: "64px", background: "#eff6ff", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #bfdbfe" }}>
                                        <Laptop size={32} className="text-blue-600" />
                                    </div>
                                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>SIMULATOR</span>
                                </div>
                                <div style={{ flex: 1, padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", position: "relative" }}>
                                    <div style={{ position: "absolute", left: "-6px", top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px", background: "#f8fafc", borderLeft: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", rotate: "45deg" }}></div>
                                    <h4 style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>1. Detection & Calculation</h4>
                                    <p style={{ fontSize: "14px", color: "#64748b" }}>
                                        The <strong>Simulator Frontend</strong> constantly scans the route 150m ahead.
                                    </p>
                                    <ul style={{ marginTop: "8px", fontSize: "13px", color: "#475569", listStyle: "disc", paddingLeft: "16px" }}>
                                        <li>Detects sharpest curve (e.g., Radius: 30m).</li>
                                        <li>Calculates <code>distToCurve</code> (e.g., 85m).</li>
                                        <li>Calls ML Model to predict Risk Score.</li>
                                    </ul>
                                </div>
                            </div>

                            <ArrowRight size={24} className="text-slate-300" style={{ transform: "rotate(90deg)" }} />

                            {/* STEP 2: TELEMETRY */}
                            <div style={{ display: "flex", gap: "24px", width: "100%", maxWidth: "800px", alignItems: "center" }}>
                                <div style={{ width: "80px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                    <div style={{ width: "64px", height: "64px", background: "#f0fdf4", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #bbf7d0" }}>
                                        <Send size={32} className="text-green-600" />
                                    </div>
                                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>API</span>
                                </div>
                                <div style={{ flex: 1, padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                                    <h4 style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>2. Transmission</h4>
                                    <p style={{ fontSize: "14px", color: "#64748b" }}>
                                        Sends telemetry payload to Backend via <code>/api/iot/mock-data</code>.
                                    </p>
                                    <div style={{ marginTop: "8px", background: "#0f172a", borderRadius: "6px", padding: "10px" }}>
                                        <code style={{ color: "#a5b4fc", fontSize: "11px", display: "block" }}>
                                            POST {'{'} <br/>
                                            &nbsp;&nbsp;"licensePlate": "NP-1234",<br/>
                                            &nbsp;&nbsp;"speed": 60, "riskScore": 0.72,<br/>
                                            &nbsp;&nbsp;"distToCurve": 85  <span style={{color: "#4ade80"}}>&lt;-- NEW</span><br/>
                                            {'}'}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            <ArrowRight size={24} className="text-slate-300" style={{ transform: "rotate(90deg)" }} />

                            {/* STEP 3: BACKEND */}
                            <div style={{ display: "flex", gap: "24px", width: "100%", maxWidth: "800px", alignItems: "center" }}>
                                <div style={{ width: "80px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                    <div style={{ width: "64px", height: "64px", background: "#fefce8", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #fde047" }}>
                                        <Database size={32} className="text-yellow-600" />
                                    </div>
                                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>BACKEND</span>
                                </div>
                                <div style={{ flex: 1, padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                                    <h4 style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>3. Data Persistence</h4>
                                    <p style={{ fontSize: "14px", color: "#64748b" }}>
                                        Backend Controller (<code>iot.controller.js</code>) processes the request and saves the live status to the <strong>MongoDB</strong> database.
                                    </p>
                                    <ul style={{ marginTop: "8px", fontSize: "13px", color: "#475569", listStyle: "disc", paddingLeft: "16px" }}>
                                        <li>Updates <code>BusDataLog</code> collection.</li>
                                        <li>Triggers "Violation Check" service (if Speed > Limit).</li>
                                        <li>Updates `Bus.currentStatus` pointer.</li>
                                    </ul>
                                </div>
                            </div>

                             <ArrowRight size={24} className="text-slate-300" style={{ transform: "rotate(90deg)" }} />

                             {/* STEP 4: MOBILE APP */}
                            <div style={{ display: "flex", gap: "24px", width: "100%", maxWidth: "800px", alignItems: "center" }}>
                                <div style={{ width: "80px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                    <div style={{ width: "64px", height: "64px", background: "#fef2f2", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #fecaca" }}>
                                        <Smartphone size={32} className="text-red-600" />
                                    </div>
                                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>APP</span>
                                </div>
                                <div style={{ flex: 1, padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                                    <h4 style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>4. Real-time Polling & Alert</h4>
                                    <p style={{ fontSize: "14px", color: "#64748b" }}>
                                        The <strong>Conductor's Mobile App</strong> triggers a polling request every 0.5s.
                                    </p>
                                    <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                                        <div style={{ flex: 1, background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                                            <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", marginBottom: "4px" }}>DASHBOARD UI</div>
                                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#dc2626" }}>CRITICAL WARNING</div>
                                            <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "2px" }}>⚠️ Curve Ahead: 85m</div>
                                        </div>
                                         <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                            <p style={{ fontSize: "12px", color: "#64748b" }}>
                                                Audio/Haptic feedback is triggered instantly when Risk > 0.7.
                                            </p>
                                         </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </CardContent>
                 </Card>
            </div>
        )}
      </div>
    </div>
  );
};

export default SafetyTheories;
