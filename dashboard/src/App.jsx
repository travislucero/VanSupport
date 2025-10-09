import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function App() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [issueDistribution, setIssueDistribution] = useState([]);
  const [resolutionTimeTrend, setResolutionTimeTrend] = useState([]);
  const [fcrData, setFcrData] = useState([]);
  const [vanPerformance, setVanPerformance] = useState([]);
  const [chronicProblemVans, setChronicProblemVans] = useState([]);
  const [handoffPatterns, setHandoffPatterns] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [selectedSequence, setSelectedSequence] = useState("");
  const [rangeType, setRangeType] = useState("7"); // "7", "30", or "custom"
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.DEV
    ? "http://localhost:3000"
    : "https://vansupport.onrender.com";

  const COLORS = ["#60A5FA", "#34D399", "#FBBF24", "#FB923C", "#A78BFA"];

  useEffect(() => {
    const queryParams =
      rangeType === "custom"
        ? customFrom && customTo
          ? `from=${customFrom}&to=${customTo}`
          : null
        : `days=${rangeType}`;

    if (!queryParams) return;

    setLoading(true);

    // Fetch all data in parallel
    Promise.all([
      fetch(`${API_BASE}/api/resolution-by-step?${queryParams}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Resolution step error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Resolution step failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/dashboard-summary?${queryParams}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Summary error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Summary failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/issue-distribution?${queryParams}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Distribution error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Issue distribution failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/resolution-time-trend?${queryParams}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Trend error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Resolution time trend failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/first-contact-resolution?${queryParams}`)
        .then((res) => {
          if (!res.ok) throw new Error(`FCR error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ First contact resolution failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/van-performance?${queryParams}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Van performance error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Van performance failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/chronic-problem-vans?${queryParams}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Chronic problem vans error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Chronic problem vans failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/handoff-patterns?${queryParams}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Handoff patterns error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Handoff patterns failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/call-volume-heatmap?${queryParams}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Call volume heatmap error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Call volume heatmap failed:", err);
          return [];
        }),
    ])
      .then(([resolutionData, summaryData, distributionData, trendData, fcrResponse, vanPerformanceData, chronicVansData, handoffData, heatmapResponse]) => {
        console.log("📊 Resolution Data:", resolutionData);
        console.log("📈 Summary Data:", summaryData);
        console.log("🥧 Issue Distribution Data:", distributionData);
        console.log("📉 Resolution Time Trend Data:", trendData);
        console.log("🎯 First Contact Resolution Data:", fcrResponse);
        console.log("🚐 Van Performance Data:", vanPerformanceData);
        console.log("⚠️ Chronic Problem Vans Data:", chronicVansData);
        console.log("🔄 Handoff Patterns Data:", handoffData);
        console.log("🔥 Call Volume Heatmap Data:", heatmapResponse);

        setData(resolutionData || []);
        setSummary(summaryData?.[0] || null);
        setIssueDistribution(distributionData || []);
        setResolutionTimeTrend(trendData || []);
        setFcrData(fcrResponse || []);
        setVanPerformance(vanPerformanceData || []);
        setChronicProblemVans(chronicVansData || []);
        setHandoffPatterns(handoffData || []);
        setHeatmapData(heatmapResponse || []);
        if (resolutionData && resolutionData.length > 0)
          setSelectedSequence(resolutionData[0].sequence_key);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Critical error fetching data:", err);
        setLoading(false);
      });
  }, [rangeType, customFrom, customTo]);

  const sequences = [...new Set(data.map((d) => d.sequence_key))];
  const filteredData = data.filter((d) => d.sequence_key === selectedSequence);

  if (loading) {
    return (
      <div
        style={{
          padding: "2rem",
          fontFamily: "Arial",
          backgroundColor: "#1e293b",
          color: "#f1f5f9",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ fontSize: "1.5rem" }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "Arial",
        backgroundColor: "#1e293b",
        color: "#f1f5f9",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ color: "#f1f5f9" }}>VanSupport Dashboard</h1>

      {/* --- Date Range Controls --- */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ color: "#f1f5f9" }}>
          <strong>Date Range:</strong>{" "}
          <select
            value={rangeType}
            onChange={(e) => setRangeType(e.target.value)}
            style={{
              marginRight: "1rem",
              padding: "0.5rem",
              backgroundColor: "#334155",
              color: "#f1f5f9",
              border: "1px solid #475569",
              borderRadius: "4px",
            }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="custom">Custom range</option>
          </select>
        </label>

        {rangeType === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{
                marginRight: "0.5rem",
                padding: "0.5rem",
                backgroundColor: "#334155",
                color: "#f1f5f9",
                border: "1px solid #475569",
                borderRadius: "4px",
              }}
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{
                padding: "0.5rem",
                backgroundColor: "#334155",
                color: "#f1f5f9",
                border: "1px solid #475569",
                borderRadius: "4px",
              }}
            />
          </>
        )}
      </div>

      {/* --- Summary Stat Cards --- */}
      {summary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              padding: "1.5rem",
              backgroundColor: "#1e40af",
              borderRadius: "8px",
              border: "1px solid #3b82f6",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#bfdbfe" }}>
              Total Calls
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem", color: "#f1f5f9" }}>
              {summary.total_calls || 0}
            </div>
          </div>

          <div
            style={{
              padding: "1.5rem",
              backgroundColor: "#166534",
              borderRadius: "8px",
              border: "1px solid #22c55e",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#bbf7d0" }}>
              Completion Rate
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem", color: "#f1f5f9" }}>
              {summary.completion_rate ? `${summary.completion_rate}%` : "0%"}
            </div>
          </div>

          <div
            style={{
              padding: "1.5rem",
              backgroundColor: "#b45309",
              borderRadius: "8px",
              border: "1px solid #f59e0b",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#fef3c7" }}>
              Avg Resolution Time
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem", color: "#f1f5f9" }}>
              {summary.avg_resolution_minutes
                ? `${Math.round(summary.avg_resolution_minutes)} min`
                : "N/A"}
            </div>
          </div>
        </div>
      )}

      {/* --- Issue Distribution Pie Chart --- */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ color: "#f1f5f9" }}>Issue Distribution</h2>
        {issueDistribution.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              backgroundColor: "#334155",
              borderRadius: "8px",
              border: "1px solid #475569",
            }}
          >
            <p style={{ color: "#94a3b8", fontSize: "1.125rem" }}>
              No data available
            </p>
          </div>
        ) : (
          <div
            style={{
              width: "400px",
              height: "400px",
              margin: "0 auto",
              backgroundColor: "#334155",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            <PieChart width={400} height={400}>
              <Pie
                data={issueDistribution}
                dataKey="total_count"
                nameKey="issue_type"
                cx={200}
                cy={180}
                outerRadius={100}
                label={({ issue_type, total_count }) =>
                  `${issue_type}: ${total_count}`
                }
                labelLine={{ stroke: "#e2e8f0" }}
              >
                {issueDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "2px solid #64748b",
                  borderRadius: "6px",
                  color: "#f1f5f9",
                }}
                itemStyle={{ color: "#f1f5f9" }}
              />
              <Legend
                wrapperStyle={{ color: "#f1f5f9" }}
                iconType="circle"
              />
            </PieChart>
          </div>
        )}
      </div>

      {/* --- Resolution Time Trend Line Chart --- */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ color: "#f1f5f9" }}>Resolution Time Trend (Last 30 Days)</h2>
        {resolutionTimeTrend.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              backgroundColor: "#334155",
              borderRadius: "8px",
              border: "1px solid #475569",
            }}
          >
            <p style={{ color: "#94a3b8", fontSize: "1.125rem" }}>
              No data available
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={resolutionTimeTrend}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                dataKey="time_bucket"
                stroke="#94a3b8"
                label={{
                  value: "Date",
                  position: "insideBottom",
                  offset: -5,
                  fill: "#f1f5f9",
                }}
              />
              <YAxis
                stroke="#94a3b8"
                label={{
                  value: "Avg Resolution Time (min)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#f1f5f9",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#334155",
                  border: "1px solid #475569",
                  color: "#f1f5f9",
                }}
              />
              <Legend wrapperStyle={{ color: "#f1f5f9" }} />
              <Line
                type="monotone"
                dataKey="avg_minutes"
                stroke="#60A5FA"
                strokeWidth={2}
                dot={{ fill: "#60A5FA", r: 4 }}
                activeDot={{ r: 6 }}
                name="Avg Resolution Time (min)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* --- First Contact Resolution Chart --- */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ color: "#f1f5f9" }}>First Contact Resolution Rate by Sequence</h2>
        {fcrData.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              backgroundColor: "#334155",
              borderRadius: "8px",
              border: "1px solid #475569",
            }}
          >
            <p style={{ color: "#94a3b8", fontSize: "1.125rem" }}>
              No data available
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={fcrData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                type="number"
                stroke="#94a3b8"
                domain={[0, 100]}
                label={{
                  value: "FCR Rate (%)",
                  position: "insideBottom",
                  offset: -5,
                  fill: "#f1f5f9",
                }}
              />
              <YAxis
                type="category"
                dataKey="sequence_key"
                stroke="#94a3b8"
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#334155",
                  border: "1px solid #475569",
                  color: "#f1f5f9",
                }}
                formatter={(value) => `${value}%`}
              />
              <Legend wrapperStyle={{ color: "#f1f5f9" }} />
              <Bar
                dataKey="fcr_rate"
                name="FCR Rate (%)"
                radius={[0, 4, 4, 0]}
              >
                {fcrData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.fcr_rate >= 80
                        ? "#22c55e"
                        : entry.fcr_rate >= 60
                        ? "#eab308"
                        : entry.fcr_rate >= 40
                        ? "#f59e0b"
                        : "#ef4444"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* --- Van Performance Table --- */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ color: "#f1f5f9" }}>Van Performance</h2>
        {vanPerformance.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              backgroundColor: "#334155",
              borderRadius: "8px",
              border: "1px solid #475569",
            }}
          >
            <p style={{ color: "#94a3b8", fontSize: "1.125rem" }}>
              No data available
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#334155",
              borderRadius: "8px",
              border: "1px solid #475569",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                color: "#f1f5f9",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#1e293b",
                    borderBottom: "2px solid #475569",
                  }}
                >
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    Make
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    Version
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    Year
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Total Issues
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Avg Resolution Time
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Escalation Rate
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Reliability Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...vanPerformance]
                  .sort((a, b) => b.total_issues - a.total_issues)
                  .map((van, index) => (
                    <tr
                      key={index}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? "#334155" : "#1e293b",
                        borderBottom: "1px solid #475569",
                      }}
                    >
                      <td style={{ padding: "1rem" }}>{van.make}</td>
                      <td style={{ padding: "1rem" }}>{van.version}</td>
                      <td style={{ padding: "1rem" }}>{van.year}</td>
                      <td
                        style={{
                          padding: "1rem",
                          textAlign: "center",
                          fontWeight: "bold",
                        }}
                      >
                        {van.total_issues}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        {van.avg_resolution_time
                          ? `${Math.round(van.avg_resolution_time)} min`
                          : "N/A"}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        {van.escalation_rate
                          ? `${van.escalation_rate}%`
                          : "0%"}
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          textAlign: "center",
                          fontWeight: "bold",
                          color:
                            van.reliability_score >= 80
                              ? "#22c55e"
                              : van.reliability_score >= 60
                              ? "#eab308"
                              : van.reliability_score >= 40
                              ? "#f59e0b"
                              : "#ef4444",
                        }}
                      >
                        {van.reliability_score || "N/A"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Chronic Problem Vans Table --- */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ color: "#f1f5f9" }}>Chronic Problem Vans</h2>
        {chronicProblemVans.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              backgroundColor: "#334155",
              borderRadius: "8px",
              border: "1px solid #475569",
            }}
          >
            <p style={{ color: "#94a3b8", fontSize: "1.125rem" }}>
              No data available
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#334155",
              borderRadius: "8px",
              border: "1px solid #475569",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                color: "#f1f5f9",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#1e293b",
                    borderBottom: "2px solid #475569",
                  }}
                >
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    Van Number
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    Make
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    Version
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    Year
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Issue Count
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    Most Common Issue
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Issue Frequency
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Last Issue Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...chronicProblemVans]
                  .sort((a, b) => b.issue_count - a.issue_count)
                  .map((van, index) => (
                    <tr
                      key={index}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? "#334155" : "#1e293b",
                        borderBottom: "1px solid #475569",
                      }}
                    >
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {van.van_number}
                          {van.issue_count >= 5 && (
                            <span
                              style={{
                                backgroundColor: "#ef4444",
                                color: "#fff",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: "bold",
                              }}
                            >
                              CRITICAL
                            </span>
                          )}
                          {van.issue_count >= 3 && van.issue_count < 5 && (
                            <span
                              style={{
                                backgroundColor: "#f59e0b",
                                color: "#fff",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: "bold",
                              }}
                            >
                              WARNING
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "1rem" }}>{van.make}</td>
                      <td style={{ padding: "1rem" }}>{van.version}</td>
                      <td style={{ padding: "1rem" }}>{van.year}</td>
                      <td
                        style={{
                          padding: "1rem",
                          textAlign: "center",
                          fontWeight: "bold",
                          color:
                            van.issue_count >= 5
                              ? "#ef4444"
                              : van.issue_count >= 3
                              ? "#f59e0b"
                              : "#f1f5f9",
                        }}
                      >
                        {van.issue_count}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        {van.most_common_issue || "N/A"}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        {van.issue_frequency || "N/A"}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        {van.last_issue_date
                          ? new Date(van.last_issue_date).toLocaleDateString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Handoff Patterns Table --- */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ color: "#f1f5f9" }}>Handoff Patterns</h2>
        <p style={{ color: "#94a3b8", marginBottom: "1rem", fontSize: "0.875rem" }}>
          Shows which troubleshooting sequences commonly lead to other sequences being started
        </p>
        {handoffPatterns.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              backgroundColor: "#334155",
              borderRadius: "8px",
              border: "1px solid #475569",
            }}
          >
            <p style={{ color: "#94a3b8", fontSize: "1.125rem" }}>
              No data available
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#334155",
              borderRadius: "8px",
              border: "1px solid #475569",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                color: "#f1f5f9",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#1e293b",
                    borderBottom: "2px solid #475569",
                  }}
                >
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "bold",
                      width: "45%",
                    }}
                  >
                    Sequence Flow
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Handoff Count
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Avg Handoff Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...handoffPatterns]
                  .sort((a, b) => b.handoff_count - a.handoff_count)
                  .map((pattern, index) => {
                    const isHighFrequency = pattern.handoff_count >= 10;
                    const isMediumFrequency = pattern.handoff_count >= 5 && pattern.handoff_count < 10;

                    return (
                      <tr
                        key={index}
                        style={{
                          backgroundColor:
                            index % 2 === 0 ? "#334155" : "#1e293b",
                          borderBottom: "1px solid #475569",
                        }}
                      >
                        <td style={{ padding: "1rem" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                            }}
                          >
                            <span
                              style={{
                                padding: "0.5rem 0.75rem",
                                backgroundColor: "#475569",
                                borderRadius: "4px",
                                fontSize: "0.875rem",
                              }}
                            >
                              {pattern.from_sequence}
                            </span>
                            <span
                              style={{
                                fontSize: "1.25rem",
                                color: isHighFrequency
                                  ? "#60A5FA"
                                  : isMediumFrequency
                                  ? "#FBBF24"
                                  : "#94a3b8",
                                fontWeight: "bold",
                              }}
                            >
                              →
                            </span>
                            <span
                              style={{
                                padding: "0.5rem 0.75rem",
                                backgroundColor: "#475569",
                                borderRadius: "4px",
                                fontSize: "0.875rem",
                              }}
                            >
                              {pattern.to_sequence}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "1rem",
                            textAlign: "center",
                            fontWeight: "bold",
                            fontSize: "1.125rem",
                            color: isHighFrequency
                              ? "#60A5FA"
                              : isMediumFrequency
                              ? "#FBBF24"
                              : "#f1f5f9",
                          }}
                        >
                          {pattern.handoff_count}
                        </td>
                        <td
                          style={{
                            padding: "1rem",
                            textAlign: "center",
                          }}
                        >
                          {pattern.avg_handoff_count
                            ? pattern.avg_handoff_count.toFixed(1)
                            : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Call Volume Heatmap --- */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ color: "#f1f5f9" }}>Call Volume Heatmap</h2>
        <p style={{ color: "#94a3b8", marginBottom: "1rem", fontSize: "0.875rem" }}>
          Shows when support calls come in - by day of week and hour of day
        </p>
        {heatmapData.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              backgroundColor: "#334155",
              borderRadius: "8px",
              border: "1px solid #475569",
            }}
          >
            <p style={{ color: "#94a3b8", fontSize: "1.125rem" }}>
              No data available
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#334155",
              borderRadius: "8px",
              border: "1px solid #475569",
              padding: "1.5rem",
              overflow: "auto",
            }}
          >
            {(() => {
              // Create a map for quick lookup: "day_hour" -> call_count
              const heatmapMap = {};
              heatmapData.forEach((item) => {
                const key = `${item.day_of_week}_${item.hour_of_day}`;
                heatmapMap[key] = item.call_count || 0;
              });

              // Find min and max for color scaling
              const callCounts = heatmapData.map((d) => d.call_count || 0);
              const minCount = Math.min(...callCounts, 0);
              const maxCount = Math.max(...callCounts, 1);

              // Color scale function: light blue (few calls) to dark red (many calls)
              const getColor = (count) => {
                if (count === 0) return "#1e293b"; // Dark background for no calls
                const intensity = (count - minCount) / (maxCount - minCount);

                if (intensity < 0.25) return "#3b82f6"; // Light blue
                if (intensity < 0.5) return "#8b5cf6"; // Purple
                if (intensity < 0.75) return "#f59e0b"; // Orange
                return "#ef4444"; // Dark red
              };

              const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
              const hours = Array.from({ length: 24 }, (_, i) => {
                if (i === 0) return "12am";
                if (i < 12) return `${i}am`;
                if (i === 12) return "12pm";
                return `${i - 12}pm`;
              });

              return (
                <div style={{ display: "inline-block" }}>
                  {/* Grid container */}
                  <div style={{ display: "grid", gridTemplateColumns: `100px repeat(24, 40px)`, gap: "2px" }}>
                    {/* Header row - hours */}
                    <div></div>
                    {hours.map((hour, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: "0.7rem",
                          color: "#94a3b8",
                          textAlign: "center",
                          padding: "0.25rem",
                          transform: "rotate(-45deg)",
                          transformOrigin: "center",
                          height: "60px",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                        }}
                      >
                        {hour}
                      </div>
                    ))}

                    {/* Data rows - one per day */}
                    {days.map((day, dayIndex) => (
                      <>
                        {/* Day label */}
                        <div
                          key={`label-${dayIndex}`}
                          style={{
                            fontSize: "0.875rem",
                            color: "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            paddingRight: "0.5rem",
                            fontWeight: "500",
                          }}
                        >
                          {day}
                        </div>

                        {/* Hourly cells for this day */}
                        {hours.map((_, hourIndex) => {
                          const key = `${dayIndex}_${hourIndex}`;
                          const count = heatmapMap[key] || 0;
                          const color = getColor(count);

                          return (
                            <div
                              key={`${dayIndex}-${hourIndex}`}
                              style={{
                                backgroundColor: color,
                                height: "40px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "2px",
                                fontSize: "0.75rem",
                                color: count > 0 ? "#fff" : "#475569",
                                fontWeight: count > 0 ? "bold" : "normal",
                                cursor: "pointer",
                                border: "1px solid #1e293b",
                                transition: "transform 0.2s",
                              }}
                              title={`${day} ${hours[hourIndex]}: ${count} calls`}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.1)";
                                e.currentTarget.style.zIndex = "10";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.zIndex = "1";
                              }}
                            >
                              {count > 0 ? count : ""}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>

                  {/* Legend */}
                  <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Call Volume:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "30px", height: "20px", backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "2px" }}></div>
                      <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>None</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "30px", height: "20px", backgroundColor: "#3b82f6", borderRadius: "2px" }}></div>
                      <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Low</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "30px", height: "20px", backgroundColor: "#8b5cf6", borderRadius: "2px" }}></div>
                      <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Medium</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "30px", height: "20px", backgroundColor: "#f59e0b", borderRadius: "2px" }}></div>
                      <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>High</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "30px", height: "20px", backgroundColor: "#ef4444", borderRadius: "2px" }}></div>
                      <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Very High</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* --- Resolution by Step Bar Chart --- */}
      <h2 style={{ color: "#f1f5f9" }}>Resolution by Step</h2>
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ color: "#f1f5f9" }}>
          <strong>Select Sequence:</strong>{" "}
          <select
            value={selectedSequence}
            onChange={(e) => setSelectedSequence(e.target.value)}
            style={{
              padding: "0.5rem",
              backgroundColor: "#334155",
              color: "#f1f5f9",
              border: "1px solid #475569",
              borderRadius: "4px",
            }}
          >
            {sequences.map((seq) => (
              <option key={seq} value={seq}>
                {seq}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredData.length === 0 ? (
        <p style={{ color: "#f1f5f9" }}>Loading...</p>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={filteredData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis
              dataKey="step_num"
              stroke="#94a3b8"
              label={{
                value: "Step",
                position: "insideBottom",
                offset: -5,
                fill: "#f1f5f9",
              }}
            />
            <YAxis
              stroke="#94a3b8"
              label={{
                value: "% Resolved",
                angle: -90,
                position: "insideLeft",
                fill: "#f1f5f9",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#334155",
                border: "1px solid #475569",
                color: "#f1f5f9",
              }}
            />
            <Legend wrapperStyle={{ color: "#f1f5f9" }} />
            <Bar dataKey="percentage" fill="#34D399" name="Resolved %" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default App;
