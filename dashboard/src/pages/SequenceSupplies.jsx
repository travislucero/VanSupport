import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Wrench,
  Package,
  ExternalLink,
  ShoppingCart,
  CheckCircle,
  Circle,
  AlertCircle,
  Info
} from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper function to format external URLs
const formatExternalUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

const SequenceSupplies = () => {
  const { sequenceKey } = useParams();

  const [supplies, setSupplies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSupplies = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/sequences/${sequenceKey}/supplies`);

        if (response.status === 404) {
          setError('Sequence not found');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch supplies');
        }

        const data = await response.json();
        setSupplies(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching supplies:', err);
        setError('Failed to load supplies information');
      } finally {
        setLoading(false);
      }
    };

    if (sequenceKey) {
      fetchSupplies();
    }
  }, [sequenceKey]);

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '1rem'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="animate-pulse space-y-4">
            <div style={{ height: '80px', backgroundColor: '#e5e7eb', borderRadius: '12px' }}></div>
            <div style={{ height: '200px', backgroundColor: '#e5e7eb', borderRadius: '12px' }}></div>
            <div style={{ height: '200px', backgroundColor: '#e5e7eb', borderRadius: '12px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !supplies) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle style={{ width: '48px', height: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
          <h1 style={{ color: '#111827', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '12px' }}>
            Not Found
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {error || 'The supplies information you\'re looking for doesn\'t exist.'}
          </p>
        </div>
      </div>
    );
  }

  const hasTools = supplies.tools && supplies.tools.length > 0;
  const hasParts = supplies.parts && supplies.parts.length > 0;
  const hasNoSupplies = !hasTools && !hasParts;

  // Group supplies by step_num
  const generalTools = supplies.tools?.filter(t => !t.step_num) || [];
  const generalParts = supplies.parts?.filter(p => !p.step_num) || [];

  // Get unique step numbers (excluding null/undefined)
  const stepNumbers = [...new Set([
    ...(supplies.tools?.filter(t => t.step_num).map(t => t.step_num) || []),
    ...(supplies.parts?.filter(p => p.step_num).map(p => p.step_num) || [])
  ])].sort((a, b) => a - b);

  const hasGeneralSupplies = generalTools.length > 0 || generalParts.length > 0;
  const hasStepSpecificSupplies = stepNumbers.length > 0;

  // If all supplies are general (no step-specific), don't show step headers
  const showStepHeaders = hasStepSpecificSupplies;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1.5rem',
          padding: '1rem'
        }}>
          <h1 style={{
            color: '#1e3a5f',
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '0.5rem'
          }}>
            Supplies Needed
          </h1>
          {supplies.sequence_name && (
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              {supplies.sequence_name}
            </p>
          )}
        </div>

        {/* No supplies needed */}
        {hasNoSupplies && (
          <Card>
            <div style={{
              padding: '2rem',
              textAlign: 'center'
            }}>
              <CheckCircle style={{
                width: '48px',
                height: '48px',
                color: '#10b981',
                margin: '0 auto 16px'
              }} />
              <h2 style={{
                color: '#111827',
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                No Special Supplies Needed
              </h2>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                You can complete this repair without any special tools or replacement parts.
              </p>
            </div>
          </Card>
        )}

        {/* General Supplies Section */}
        {hasGeneralSupplies && (
          <Card style={{ marginBottom: '1rem' }}>
            <div style={{ padding: '1rem' }}>
              {showStepHeaders && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid #1e3a5f'
                }}>
                  <h2 style={{
                    color: '#1e3a5f',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    margin: 0
                  }}>
                    General Supplies
                  </h2>
                  <Badge color="blue">{generalTools.length + generalParts.length}</Badge>
                </div>
              )}

              <SuppliesSection tools={generalTools} parts={generalParts} showStepHeaders={showStepHeaders} />
            </div>
          </Card>
        )}

        {/* Step-Specific Supplies */}
        {stepNumbers.map((stepNum) => {
          const stepTools = supplies.tools?.filter(t => t.step_num === stepNum) || [];
          const stepParts = supplies.parts?.filter(p => p.step_num === stepNum) || [];

          return (
            <Card key={stepNum} style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '1rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid #5a8aa3'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#1e3a5f',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '700'
                  }}>
                    {stepNum}
                  </div>
                  <h2 style={{
                    color: '#111827',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    margin: 0
                  }}>
                    Step {stepNum} Supplies
                  </h2>
                  <Badge color="blue">{stepTools.length + stepParts.length}</Badge>
                </div>

                <SuppliesSection tools={stepTools} parts={stepParts} showStepHeaders={true} />
              </div>
            </Card>
          );
        })}

        {/* Info footer */}
        {!hasNoSupplies && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '1rem',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <Info style={{ width: '16px', height: '16px', color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
            <p style={{
              color: '#1e40af',
              fontSize: '0.75rem',
              margin: 0,
              lineHeight: '1.5'
            }}>
              Having the right tools and parts ready before you start will help you complete the repair more efficiently.
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          padding: '1rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
            MAX Van Support
          </p>
        </div>
      </div>
    </div>
  );
};

// Supplies Section Component - displays tools and parts together
const SuppliesSection = ({ tools, parts, showStepHeaders }) => {
  const requiredTools = tools.filter(t => t.is_required);
  const optionalTools = tools.filter(t => !t.is_required);
  const requiredParts = parts.filter(p => p.is_required);
  const optionalParts = parts.filter(p => !p.is_required);

  const hasTools = tools.length > 0;
  const hasParts = parts.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Tools */}
      {hasTools && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <Wrench style={{ width: '18px', height: '18px', color: '#1e3a5f' }} />
            <h3 style={{
              color: '#111827',
              fontSize: '1rem',
              fontWeight: '600',
              margin: 0
            }}>
              Tools
            </h3>
            <Badge color="blue">{tools.length}</Badge>
          </div>

          {/* Required Tools */}
          {requiredTools.length > 0 && (
            <div style={{ marginBottom: optionalTools.length > 0 ? '1rem' : 0 }}>
              {optionalTools.length > 0 && (
                <p style={{
                  color: '#dc2626',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem'
                }}>
                  Required
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {requiredTools.map((tool) => (
                  <ToolItem key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          )}

          {/* Optional Tools */}
          {optionalTools.length > 0 && (
            <div>
              <p style={{
                color: '#6b7280',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem'
              }}>
                Optional
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {optionalTools.map((tool) => (
                  <ToolItem key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Parts */}
      {hasParts && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <Package style={{ width: '18px', height: '18px', color: '#10b981' }} />
            <h3 style={{
              color: '#111827',
              fontSize: '1rem',
              fontWeight: '600',
              margin: 0
            }}>
              Replacement Parts
            </h3>
            <Badge color="green">{parts.length}</Badge>
          </div>

          {/* Required Parts */}
          {requiredParts.length > 0 && (
            <div style={{ marginBottom: optionalParts.length > 0 ? '1rem' : 0 }}>
              {optionalParts.length > 0 && (
                <p style={{
                  color: '#dc2626',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem'
                }}>
                  Required
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {requiredParts.map((part) => (
                  <PartItem key={part.id} part={part} />
                ))}
              </div>
            </div>
          )}

          {/* Optional Parts */}
          {optionalParts.length > 0 && (
            <div>
              <p style={{
                color: '#6b7280',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem'
              }}>
                Optional
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {optionalParts.map((part) => (
                  <PartItem key={part.id} part={part} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Tool Item Component
const ToolItem = ({ tool }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '0.75rem',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: tool.is_required ? '#fef2f2' : '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {tool.is_required ? (
          <CheckCircle size={14} style={{ color: '#dc2626' }} />
        ) : (
          <Circle size={14} style={{ color: '#9ca3af' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: '#111827',
          fontSize: '0.875rem',
          fontWeight: '500',
          margin: 0,
          marginBottom: tool.tool_description ? '4px' : 0
        }}>
          {tool.tool_name}
        </p>
        {tool.tool_description && (
          <p style={{
            color: '#6b7280',
            fontSize: '0.75rem',
            margin: 0,
            lineHeight: '1.4'
          }}>
            {tool.tool_description}
          </p>
        )}
      </div>
      {tool.tool_link && (
        <a
          href={formatExternalUrl(tool.tool_link)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            backgroundColor: '#1e3a5f',
            color: 'white',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: '500',
            textDecoration: 'none',
            flexShrink: 0
          }}
        >
          View
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
};

// Part Item Component
const PartItem = ({ part }) => {
  const formatPrice = (price) => {
    if (!price) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '0.75rem',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: part.is_required ? '#fef2f2' : '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {part.is_required ? (
          <CheckCircle size={14} style={{ color: '#dc2626' }} />
        ) : (
          <Circle size={14} style={{ color: '#9ca3af' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: '#111827',
          fontSize: '0.875rem',
          fontWeight: '500',
          margin: 0,
          marginBottom: '4px'
        }}>
          {part.part_name}
        </p>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center'
        }}>
          {part.part_number && (
            <span style={{
              color: '#6b7280',
              fontSize: '0.75rem',
              backgroundColor: '#e5e7eb',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              #{part.part_number}
            </span>
          )}
          {part.estimated_price && (
            <span style={{
              color: '#059669',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              ~{formatPrice(part.estimated_price)}
            </span>
          )}
        </div>
        {part.part_description && (
          <p style={{
            color: '#6b7280',
            fontSize: '0.75rem',
            margin: 0,
            marginTop: '4px',
            lineHeight: '1.4'
          }}>
            {part.part_description}
          </p>
        )}
      </div>
      {part.part_link && (
        <a
          href={formatExternalUrl(part.part_link)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: '500',
            textDecoration: 'none',
            flexShrink: 0
          }}
        >
          Buy
          <ShoppingCart size={12} />
        </a>
      )}
    </div>
  );
};

export default SequenceSupplies;
