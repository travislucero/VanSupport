import React from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import { theme } from '../styles/theme';
import { List, Construction } from 'lucide-react';

function Sequences() {
  const { user, logout, hasRole } = useAuth();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} />

      <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'] }}>
        {/* Header */}
        <div style={{ marginBottom: theme.spacing['2xl'] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.xs }}>
            <List size={32} color={theme.colors.accent.primary} strokeWidth={2} />
            <h1
              style={{
                fontSize: theme.fontSize['4xl'],
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text.primary,
                margin: 0,
              }}
            >
              Sequences
            </h1>
          </div>
          <p style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.base, margin: 0 }}>
            View troubleshooting sequences and step-by-step guides
          </p>
        </div>

        {/* Coming Soon Card */}
        <Card>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: theme.spacing['2xl'],
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '120px',
                height: '120px',
                backgroundColor: `${theme.colors.accent.primary}15`,
                borderRadius: theme.radius.full,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: theme.spacing.xl,
              }}
            >
              <Construction size={60} color={theme.colors.accent.primary} strokeWidth={1.5} />
            </div>

            <h2
              style={{
                fontSize: theme.fontSize['2xl'],
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text.primary,
                marginBottom: theme.spacing.md,
              }}
            >
              Feature Under Development
            </h2>

            <p
              style={{
                fontSize: theme.fontSize.lg,
                color: theme.colors.text.secondary,
                maxWidth: '600px',
                lineHeight: 1.6,
                marginBottom: theme.spacing.lg,
              }}
            >
              The Sequences feature is currently being developed. Soon you'll be able to view all troubleshooting
              sequences, step-by-step guides, and resolution workflows in one place.
            </p>

            <div
              style={{
                display: 'flex',
                gap: theme.spacing.md,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                  backgroundColor: theme.colors.background.tertiary,
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                }}
              >
                ✓ Browse sequences
              </div>
              <div
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                  backgroundColor: theme.colors.background.tertiary,
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                }}
              >
                ✓ View step details
              </div>
              <div
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                  backgroundColor: theme.colors.background.tertiary,
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                }}
              >
                ✓ Search & filter
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Sequences;
