import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { BookOpen, Calculator, Activity, AlertTriangle, ArrowRight, ShieldCheck, Divide } from "lucide-react";

const SafetyTheories = () => {
  const [activeTab, setActiveTab] = useState("rollover");

  const tabs = [
    { id: "rollover", label: "Rollover Prediction", icon: Activity },
    { id: "stopping", label: "Stopping Distance", icon: ShieldCheck },
    { id: "geometry", label: "Road Geometry", icon: Calculator },
    { id: "constants", label: "Constants & Thresholds", icon: BookOpen },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
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
                  <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <h3 style={{ fontWeight: "600", marginBottom: "16px", color: "#1e293b" }}>1. Static Stability Factor (SSF)</h3>
                    <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "12px" }}>
                      A dimensionless ratio that defines the vehicle's geometric resistance to rollover.
                    </p>
                    <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #cbd5e1", textAlign: "center", marginBottom: "12px" }}>
                       <code style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>SSF = T / (2 × h_CoG)</code>
                    </div>
                    <ul style={{ fontSize: "14px", color: "#475569", paddingLeft: "20px", listStyleType: "disc" }}>
                      <li><strong>T</strong>: Track Width (2.0 m)</li>
                      <li><strong>h_CoG</strong>: Dynamic Center of Gravity Height</li>
                    </ul>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                     <h3 style={{ fontWeight: "600", marginBottom: "16px", color: "#1e293b" }}>2. Lateral Acceleration</h3>
                     <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "12px" }}>
                        The centrifugal force experienced by the bus while cornering.
                     </p>
                    <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #cbd5e1", textAlign: "center", marginBottom: "12px" }}>
                       <code style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>a_lat = v² / (r × g)</code>
                    </div>
                    <ul style={{ fontSize: "14px", color: "#475569", paddingLeft: "20px", listStyleType: "disc" }}>
                      <li><strong>v</strong>: Velocity (m/s)</li>
                      <li><strong>r</strong>: Curve Radius (m)</li>
                      <li><strong>g</strong>: Gravity (9.81 m/s²)</li>
                    </ul>
                  </div>
                </div>

                <div style={{ marginTop: "24px", padding: "24px", background: "#fef2f2", borderRadius: "12px", border: "1px solid #fee2e2" }}>
                   <h3 style={{ fontWeight: "600", marginBottom: "16px", color: "#b91c1c", display:"flex", alignItems:"center", gap:"8px" }}>
                      <AlertTriangle size={20}/> Rollover Condition
                   </h3>
                   <p style={{ color: "#7f1d1d", marginBottom: "12px" }}>
                      Physics dictates that a vehicle will roll over when the lateral acceleration exceeds its stability factor.
                   </p>
                   <div style={{ background: "rgba(255,255,255,0.5)", padding: "16px", borderRadius: "8px", textAlign: "center", border: "1px solid #fecaca" }}>
                      <code style={{ fontSize: "20px", fontWeight: "700", color: "#b91c1c" }}>a_lat {'>'} SSF</code>
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
                           Calculates the total distance required to bring the bus to a halt, considering road slope and friction.
                       </p>
                       <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", padding: "32px", background: "#f8fafc", borderRadius: "12px", marginBottom: "24px" }}>
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
                       
                        <h3 style={{ fontWeight: "600", marginBottom: "12px", color: "#1e293b" }}>Braking Physics</h3>
                        <div style={{ background: "#f1f5f9", padding: "16px", borderRadius: "8px", fontFamily: "monospace", color: "#334155" }}>
                            d_brake = v² / (2 × a_decel)<br/><br/>
                            a_decel = g × ( μ × cos(θ) ± sin(θ) )
                        </div>
                        <p style={{ marginTop: "12px", fontSize: "14px", color: "#64748b" }}>
                            Where <strong>μ</strong> is friction coefficient and <strong>θ</strong> is road slope angle. +sin(θ) for uphill, -sin(θ) for downhill.
                        </p>
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
                                {/* Simple visualization of 3 points making a circle */}
                                <svg width="200" height="150" viewBox="0 0 200 150">
                                    <circle cx="100" cy="180" r="140" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
                                    <path d="M 40 70 Q 100 40 160 70" fill="none" stroke="#2563eb" strokeWidth="4" />
                                    <circle cx="40" cy="70" r="4" fill="#ef4444" />
                                    <circle cx="100" cy="50" r="4" fill="#ef4444" />
                                    <circle cx="160" cy="70" r="4" fill="#ef4444" />
                                    <text x="100" y="100" textAnchor="middle" fill="#64748b" fontSize="12">R = Circumradius</text>
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
                                </tbody>
                            </table>
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
      </div>
    </div>
  );
};

export default SafetyTheories;
