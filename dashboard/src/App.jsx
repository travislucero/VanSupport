import React, { useEffect, useState } from "react";
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
import { Phone, CheckCircle, Clock } from "lucide-react";
import Login from "./Login";
import { useAuth } from "./hooks/useAuth.jsx";
import Sidebar from "./components/Sidebar";
import Card from "./components/Card";
import StatCard from "./components/StatCard";
import Badge from "./components/Badge";
import Avatar from "./components/Avatar";
import { theme } from "./styles/theme";

function App() {
  const { user, isAuthenticated, authLoading, logout, hasPermission, hasRole } = useAuth();
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
  const [rangeType, setRangeType] = useState("7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.DEV
    ? "http://localhost:3000"
    : "https://vansupport.onrender.com";

  const CHART_COLORS = [
    theme.colors.chart.blue,
    theme.colors.chart.green,
    theme.colors.chart.orange,
    theme.colors.chart.purple,
    theme.colors.chart.pink,
    theme.colors.chart.cyan,
  ];

  useEffect(() => {
    if (!isAuthenticated) return;

    const queryParams =
      rangeType === "custom"
        ? customFrom && customTo
          ? `from=${customFrom}&to=${customTo}`
          : null
        : `days=${rangeType}`;

    if (!queryParams) return;

    setLoading(true);

    const fetchPromises = [
      fetch(`${API_BASE}/api/resolution-by-step?${queryParams}`, {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Resolution step error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Resolution step failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/dashboard-summary?${queryParams}`, {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Summary error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Summary failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/issue-distribution?${queryParams}`, {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Distribution error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Issue distribution failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/resolution-time-trend?${queryParams}`, {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Trend error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Resolution time trend failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/first-contact-resolution?${queryParams}`, {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) throw new Error(`FCR error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ First contact resolution failed:", err);
          return [];
        }),
      fetch(`${API_BASE}/api/call-volume-heatmap?${queryParams}`, {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Call volume heatmap error: ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          console.error("❌ Call volume heatmap failed:", err);
          return [];
        }),
    ];

    if (hasRole('admin') || hasRole('manager')) {
      fetchPromises.push(
        fetch(`${API_BASE}/api/van-performance?${queryParams}`, {
          credentials: "include",
        })
          .then((res) => {
            if (!res.ok) throw new Error(`Van performance error: ${res.status}`);
            return res.json();
          })
          .catch((err) => {
            console.error("❌ Van performance failed:", err);
            return [];
          }),
        fetch(`${API_BASE}/api/handoff-patterns?${queryParams}`, {
          credentials: "include",
        })
          .then((res) => {
            if (!res.ok) throw new Error(`Handoff patterns error: ${res.status}`);
            return res.json();
          })
          .catch((err) => {
            console.error("❌ Handoff patterns failed:", err);
            return [];
          })
      );
    }

    if (hasRole('admin')) {
      fetchPromises.push(
        fetch(`${API_BASE}/api/chronic-problem-vans?${queryParams}`, {
          credentials: "include",
        })
          .then((res) => {
            if (!res.ok) throw new Error(`Chronic problem vans error: ${res.status}`);
            return res.json();
          })
          .catch((err) => {
            console.error("❌ Chronic problem vans failed:", err);
            return [];
          })
      );
    }

    Promise.all(fetchPromises)
      .then((results) => {
        const [resolutionData, summaryData, distributionData, trendData, fcrResponse, heatmapResponse] = results;

        setData(resolutionData || []);
        setSummary(summaryData?.[0] || null);
        setIssueDistribution(distributionData || []);
        setResolutionTimeTrend(trendData || []);
        setFcrData(fcrResponse || []);
        setHeatmapData(heatmapResponse || []);

        if (hasRole('admin') || hasRole('manager')) {
          const vanPerformanceData = results[6];
          const handoffData = results[7];
          setVanPerformance(vanPerformanceData || []);
          setHandoffPatterns(handoffData || []);
        } else {
          setVanPerformance([]);
          setHandoffPatterns([]);
        }

        if (hasRole('admin')) {
          const chronicVansData = results[8];
          setChronicProblemVans(chronicVansData || []);
        } else {
          setChronicProblemVans([]);
        }

        if (resolutionData && resolutionData.length > 0)
          setSelectedSequence(resolutionData[0].sequence_key);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Critical error fetching data:", err);
        setLoading(false);
      });
  }, [rangeType, customFrom, customTo, isAuthenticated, hasRole]);

  const sequences = [...new Set(data.map((d) => d.sequence_key))];
  const filteredData = data.filter((d) => d.sequence_key === selectedSequence);

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: theme.colors.background.primary,
          color: theme.colors.text.primary,
          fontSize: theme.fontSize['2xl'],
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: theme.colors.background.primary,
          color: theme.colors.text.primary,
          fontSize: theme.fontSize['2xl'],
        }}
      >
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: theme.colors.background.primary }}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} />

      <div style={{ marginLeft: "260px", flex: 1, padding: theme.spacing['2xl'] }}>
        {/* Header */}
        <div style={{ marginBottom: theme.spacing['2xl'] }}>
          <h1
            style={{
              fontSize: theme.fontSize['4xl'],
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.xs,
            }}
          >
            Analytics Dashboard
          </h1>
          <p style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.base }}>
            Welcome back, {user?.email?.split('@')[0] || 'User'}
          </p>
        </div>

        {/* Date Range Controls */}
        <Card style={{ marginBottom: theme.spacing['2xl'] }}>
          <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" }}>
            <div>
              <label
                style={{
                  color: theme.colors.text.secondary,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  marginBottom: theme.spacing.xs,
                  display: "block",
                }}
              >
                Date Range
              </label>
              <select
                value={rangeType}
                onChange={(e) => setRangeType(e.target.value)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: theme.colors.background.tertiary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            {rangeType === "custom" && (
              <>
                <div>
                  <label
                    style={{
                      color: theme.colors.text.secondary,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      marginBottom: theme.spacing.xs,
                      display: "block",
                    }}
                  >
                    From
                  </label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      backgroundColor: theme.colors.background.tertiary,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.md,
                      fontSize: theme.fontSize.sm,
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      color: theme.colors.text.secondary,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      marginBottom: theme.spacing.xs,
                      display: "block",
                    }}
                  >
                    To
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      backgroundColor: theme.colors.background.tertiary,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.md,
                      fontSize: theme.fontSize.sm,
                      outline: "none",
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Summary Stats */}
        {summary && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: theme.spacing.lg,
              marginBottom: theme.spacing['2xl'],
            }}
          >
            <StatCard
              title="Total Calls"
              value={summary.total_calls || 0}
              icon={<Phone size={24} />}
              color={theme.colors.accent.primary}
            />
            <StatCard
              title="Completion Rate"
              value={summary.completion_rate ? `${summary.completion_rate}%` : "0%"}
              icon={<CheckCircle size={24} />}
              color={theme.colors.accent.success}
            />
            <StatCard
              title="Avg Resolution Time"
              value={
                summary.avg_resolution_minutes
                  ? `${Math.round(summary.avg_resolution_minutes)}m`
                  : "N/A"
              }
              icon={<Clock size={24} />}
              color={theme.colors.accent.warning}
            />
          </div>
        )}

        {/* Charts Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
            gap: theme.spacing.lg,
            marginBottom: theme.spacing['2xl'],
          }}
        >
          {/* Issue Distribution */}
          <Card
            title="Issue Distribution"
            description="Breakdown of issue types"
            action={
              <button
                style={{
                  padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                  backgroundColor: theme.colors.background.tertiary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                }}
              >
                View Details
              </button>
            }
          >
            {issueDistribution.length === 0 ? (
              <div style={{ padding: theme.spacing['2xl'], textAlign: "center", color: theme.colors.text.secondary }}>
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={issueDistribution}
                    dataKey="total_count"
                    nameKey="issue_type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ issue_type, total_count }) => `${issue_type}: ${total_count}`}
                    labelLine={{ stroke: theme.colors.text.secondary }}
                  >
                    {issueDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.colors.background.tertiary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.md,
                      color: theme.colors.text.primary,
                    }}
                  />
                  <Legend wrapperStyle={{ color: theme.colors.text.primary }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Resolution Time Trend */}
          <Card
            title="Resolution Time Trend"
            description="Average resolution time over the last 30 days"
          >
            {resolutionTimeTrend.length === 0 ? (
              <div style={{ padding: theme.spacing['2xl'], textAlign: "center", color: theme.colors.text.secondary }}>
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={resolutionTimeTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.medium} />
                  <XAxis dataKey="time_bucket" stroke={theme.colors.text.secondary} />
                  <YAxis stroke={theme.colors.text.secondary} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.colors.background.tertiary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.md,
                      color: theme.colors.text.primary,
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avg_minutes"
                    stroke={theme.colors.chart.blue}
                    strokeWidth={3}
                    dot={{ fill: theme.colors.chart.blue, r: 5 }}
                    activeDot={{ r: 7 }}
                    name="Avg Resolution Time (min)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* First Contact Resolution */}
        <Card
          title="First Contact Resolution Rate"
          description="Resolution rate by troubleshooting sequence"
          style={{ marginBottom: theme.spacing['2xl'] }}
        >
          {fcrData.length === 0 ? (
            <div style={{ padding: theme.spacing['2xl'], textAlign: "center", color: theme.colors.text.secondary }}>
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={fcrData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.medium} />
                <XAxis type="number" stroke={theme.colors.text.secondary} domain={[0, 100]} />
                <YAxis type="category" dataKey="sequence_key" stroke={theme.colors.text.secondary} width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.colors.background.tertiary,
                    border: `1px solid ${theme.colors.border.medium}`,
                    borderRadius: theme.radius.md,
                    color: theme.colors.text.primary,
                  }}
                  formatter={(value) => `${value}%`}
                />
                <Legend />
                <Bar dataKey="fcr_rate" name="FCR Rate (%)" radius={[0, 8, 8, 0]}>
                  {fcrData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.fcr_rate >= 80
                          ? theme.colors.accent.success
                          : entry.fcr_rate >= 60
                          ? theme.colors.chart.yellow
                          : entry.fcr_rate >= 40
                          ? theme.colors.accent.warning
                          : theme.colors.accent.danger
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Van Performance Table */}
        {(hasRole('admin') || hasRole('manager')) && vanPerformance.length > 0 && (
          <Card
            title="Van Performance"
            description="Performance metrics by van make, model, and year"
            style={{ marginBottom: theme.spacing['2xl'] }}
            noPadding
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: theme.colors.background.tertiary, borderBottom: `2px solid ${theme.colors.border.light}` }}>
                    <th style={{ padding: theme.spacing.md, textAlign: "left", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Make</th>
                    <th style={{ padding: theme.spacing.md, textAlign: "left", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Version</th>
                    <th style={{ padding: theme.spacing.md, textAlign: "left", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Year</th>
                    <th style={{ padding: theme.spacing.md, textAlign: "center", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Total Issues</th>
                    <th style={{ padding: theme.spacing.md, textAlign: "center", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Avg Time</th>
                    <th style={{ padding: theme.spacing.md, textAlign: "center", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Reliability</th>
                  </tr>
                </thead>
                <tbody>
                  {[...vanPerformance]
                    .sort((a, b) => b.total_issues - a.total_issues)
                    .map((van, index) => (
                      <tr
                        key={index}
                        style={{
                          borderBottom: `1px solid ${theme.colors.border.light}`,
                        }}
                      >
                        <td style={{ padding: theme.spacing.md, color: theme.colors.text.primary }}>{van.make}</td>
                        <td style={{ padding: theme.spacing.md, color: theme.colors.text.primary }}>{van.version}</td>
                        <td style={{ padding: theme.spacing.md, color: theme.colors.text.primary }}>{van.year}</td>
                        <td style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: theme.fontWeight.semibold, color: theme.colors.text.primary }}>
                          {van.total_issues}
                        </td>
                        <td style={{ padding: theme.spacing.md, textAlign: "center", color: theme.colors.text.secondary }}>
                          {van.avg_resolution_time ? `${Math.round(van.avg_resolution_time)}m` : "N/A"}
                        </td>
                        <td style={{ padding: theme.spacing.md, textAlign: "center" }}>
                          <Badge
                            variant={
                              van.reliability_score >= 80
                                ? "success"
                                : van.reliability_score >= 60
                                ? "warning"
                                : "danger"
                            }
                          >
                            {van.reliability_score || "N/A"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Chronic Problem Vans */}
        {hasRole('admin') && chronicProblemVans.length > 0 && (
          <Card
            title="Chronic Problem Vans"
            description="Vans with recurring issues requiring attention"
            style={{ marginBottom: theme.spacing['2xl'] }}
            noPadding
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: theme.colors.background.tertiary, borderBottom: `2px solid ${theme.colors.border.light}` }}>
                    <th style={{ padding: theme.spacing.md, textAlign: "left", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Van Number</th>
                    <th style={{ padding: theme.spacing.md, textAlign: "left", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Make/Model</th>
                    <th style={{ padding: theme.spacing.md, textAlign: "center", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Issue Count</th>
                    <th style={{ padding: theme.spacing.md, textAlign: "left", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Most Common</th>
                    <th style={{ padding: theme.spacing.md, textAlign: "center", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Last Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {[...chronicProblemVans]
                    .sort((a, b) => b.issue_count - a.issue_count)
                    .map((van, index) => (
                      <tr key={index} style={{ borderBottom: `1px solid ${theme.colors.border.light}` }}>
                        <td style={{ padding: theme.spacing.md }}>
                          <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
                            <Avatar name={van.van_number} size="sm" />
                            <span style={{ color: theme.colors.text.primary, fontWeight: theme.fontWeight.medium }}>
                              {van.van_number}
                            </span>
                            {van.issue_count >= 5 && <Badge variant="danger" size="sm">CRITICAL</Badge>}
                            {van.issue_count >= 3 && van.issue_count < 5 && <Badge variant="warning" size="sm">WARNING</Badge>}
                          </div>
                        </td>
                        <td style={{ padding: theme.spacing.md, color: theme.colors.text.primary }}>
                          {van.make} {van.version} ({van.year})
                        </td>
                        <td style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: theme.fontWeight.bold, color: van.issue_count >= 5 ? theme.colors.accent.danger : van.issue_count >= 3 ? theme.colors.accent.warning : theme.colors.text.primary }}>
                          {van.issue_count}
                        </td>
                        <td style={{ padding: theme.spacing.md, color: theme.colors.text.secondary }}>
                          {van.most_common_issue || "N/A"}
                        </td>
                        <td style={{ padding: theme.spacing.md, textAlign: "center", color: theme.colors.text.secondary }}>
                          {van.last_issue_date ? new Date(van.last_issue_date).toLocaleDateString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Handoff Patterns */}
        {(hasRole('admin') || hasRole('manager')) && handoffPatterns.length > 0 && (
          <Card
            title="Handoff Patterns"
            description="Common troubleshooting sequence transitions"
            style={{ marginBottom: theme.spacing['2xl'] }}
            noPadding
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: theme.colors.background.tertiary, borderBottom: `2px solid ${theme.colors.border.light}` }}>
                    <th style={{ padding: theme.spacing.md, textAlign: "left", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Sequence Flow</th>
                    <th style={{ padding: theme.spacing.md, textAlign: "center", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Handoff Count</th>
                    <th style={{ padding: theme.spacing.md, textAlign: "center", color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>Avg Handoffs</th>
                  </tr>
                </thead>
                <tbody>
                  {[...handoffPatterns]
                    .sort((a, b) => b.handoff_count - a.handoff_count)
                    .map((pattern, index) => {
                      const isHighFrequency = pattern.handoff_count >= 10;
                      return (
                        <tr key={index} style={{ borderBottom: `1px solid ${theme.colors.border.light}` }}>
                          <td style={{ padding: theme.spacing.md }}>
                            <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.md }}>
                              <Badge variant="default">{pattern.from_sequence}</Badge>
                              <span style={{ color: isHighFrequency ? theme.colors.chart.blue : theme.colors.text.tertiary, fontSize: theme.fontSize.xl }}>→</span>
                              <Badge variant="default">{pattern.to_sequence}</Badge>
                            </div>
                          </td>
                          <td style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: theme.fontWeight.bold, color: isHighFrequency ? theme.colors.chart.blue : theme.colors.text.primary }}>
                            {pattern.handoff_count}
                          </td>
                          <td style={{ padding: theme.spacing.md, textAlign: "center", color: theme.colors.text.secondary }}>
                            {pattern.avg_handoff_count ? pattern.avg_handoff_count.toFixed(1) : "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Call Volume Heatmap */}
        <Card
          title="Call Volume Heatmap"
          description="Support call patterns by day and hour"
          style={{ marginBottom: theme.spacing['2xl'] }}
        >
          {heatmapData.length === 0 ? (
            <div style={{ padding: theme.spacing['2xl'], textAlign: "center", color: theme.colors.text.secondary }}>
              No data available
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              {(() => {
                const heatmapMap = {};
                heatmapData.forEach((item) => {
                  const key = `${item.day_of_week}_${item.hour_of_day}`;
                  heatmapMap[key] = item.call_count || 0;
                });

                const callCounts = heatmapData.map((d) => d.call_count || 0);
                const minCount = Math.min(...callCounts, 0);
                const maxCount = Math.max(...callCounts, 1);

                const getColor = (count) => {
                  if (count === 0) return theme.colors.background.primary;
                  const intensity = (count - minCount) / (maxCount - minCount);
                  if (intensity < 0.25) return theme.colors.chart.blue;
                  if (intensity < 0.5) return theme.colors.chart.purple;
                  if (intensity < 0.75) return theme.colors.chart.orange;
                  return theme.colors.accent.danger;
                };

                const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                const hours = Array.from({ length: 24 }, (_, i) => {
                  if (i === 0) return "12am";
                  if (i < 12) return `${i}am`;
                  if (i === 12) return "12pm";
                  return `${i - 12}pm`;
                });

                return (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: `100px repeat(24, 40px)`, gap: "2px", marginBottom: theme.spacing.lg }}>
                      <div></div>
                      {hours.map((hour, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: theme.fontSize.xs,
                            color: theme.colors.text.tertiary,
                            textAlign: "center",
                            transform: "rotate(-45deg)",
                            height: "60px",
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "center",
                          }}
                        >
                          {hour}
                        </div>
                      ))}

                      {days.map((day, dayIndex) => (
                        <React.Fragment key={`day-${dayIndex}`}>
                          <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.primary, display: "flex", alignItems: "center", fontWeight: theme.fontWeight.medium }}>
                            {day}
                          </div>

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
                                  borderRadius: theme.radius.sm,
                                  fontSize: theme.fontSize.xs,
                                  color: count > 0 ? theme.colors.text.primary : theme.colors.text.tertiary,
                                  fontWeight: count > 0 ? theme.fontWeight.semibold : theme.fontWeight.normal,
                                  cursor: "pointer",
                                  transition: "transform 0.2s",
                                }}
                                title={`${day} ${hours[hourIndex]}: ${count} calls`}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = "scale(1.1)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "scale(1)";
                                }}
                              >
                                {count > 0 ? count : ""}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.lg, flexWrap: "wrap" }}>
                      <span style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>Call Volume:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
                        <div style={{ width: "30px", height: "20px", backgroundColor: theme.colors.background.primary, border: `1px solid ${theme.colors.border.light}`, borderRadius: theme.radius.sm }}></div>
                        <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.sm }}>None</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
                        <div style={{ width: "30px", height: "20px", backgroundColor: theme.colors.chart.blue, borderRadius: theme.radius.sm }}></div>
                        <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.sm }}>Low</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
                        <div style={{ width: "30px", height: "20px", backgroundColor: theme.colors.chart.purple, borderRadius: theme.radius.sm }}></div>
                        <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.sm }}>Medium</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
                        <div style={{ width: "30px", height: "20px", backgroundColor: theme.colors.chart.orange, borderRadius: theme.radius.sm }}></div>
                        <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.sm }}>High</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
                        <div style={{ width: "30px", height: "20px", backgroundColor: theme.colors.accent.danger, borderRadius: theme.radius.sm }}></div>
                        <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.sm }}>Very High</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </Card>

        {/* Resolution by Step */}
        <Card
          title="Resolution by Step"
          description="Percentage of issues resolved at each troubleshooting step"
          action={
            <select
              value={selectedSequence}
              onChange={(e) => setSelectedSequence(e.target.value)}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                backgroundColor: theme.colors.background.tertiary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                cursor: "pointer",
              }}
            >
              {sequences.map((seq) => (
                <option key={seq} value={seq}>
                  {seq}
                </option>
              ))}
            </select>
          }
        >
          {filteredData.length === 0 ? (
            <div style={{ padding: theme.spacing['2xl'], textAlign: "center", color: theme.colors.text.secondary }}>
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.medium} />
                <XAxis dataKey="step_num" stroke={theme.colors.text.secondary} />
                <YAxis stroke={theme.colors.text.secondary} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.colors.background.tertiary,
                    border: `1px solid ${theme.colors.border.medium}`,
                    borderRadius: theme.radius.md,
                    color: theme.colors.text.primary,
                  }}
                />
                <Legend />
                <Bar dataKey="percentage" fill={theme.colors.chart.green} name="Resolved %" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

export default App;
