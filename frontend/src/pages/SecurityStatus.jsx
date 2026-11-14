
import {
    useCallback,
    useEffect,
    useState
} from 'react';

import { getSecurityOverview } from '../services/securityService';

import '../styles/SecurityStatus.css';

// ============================================================
// FORMATTERS
// ============================================================

function formatDate(value) {
    if (!value) return '—';

    const date = new Date(
        String(value).replace(' ', 'T')
    );

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

function statusLabel(status) {
    const labels = {
        ACTIVE: 'Active',
        PARTIAL: 'Partial',
        NOT_CONFIGURED: 'Not configured',
        INACTIVE: 'Inactive',
        NOT_FOUND: 'Not found'
    };

    return labels[status] || status || 'Unknown';
}

function statusClass(status) {
    if (status === 'ACTIVE') {
        return 'security-status active';
    }

    if (status === 'PARTIAL') {
        return 'security-status partial';
    }

    return 'security-status inactive';
}

// ============================================================
// SECURITY STATUS PAGE - HU37
// ============================================================

export default function SecurityStatus() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadOverview = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const result = await getSecurityOverview();
            setData(result);
        } catch (err) {
            console.error(
                'Security overview could not be loaded:',
                err
            );

            if (err.response?.status === 403) {
                setError(
                    'You do not have permission to view security information.'
                );
            } else if (err.response?.status === 401) {
                setError(
                    'Your session has expired. Please sign in again.'
                );
            } else {
                setError(
                    err.response?.data?.message ||
                    'Unable to load security information.'
                );
            }

            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOverview();
    }, [loadOverview]);

    return (
        <div className="page security-page">

            {/* HEADER */}

            <div className="page-heading">
                <div>
                    <h1>Security & Sessions</h1>

                    <p>
                        Review authentication, access controls
                        and active system sessions.
                    </p>
                </div>

                <button
                    type="button"
                    className="button ghost"
                    onClick={loadOverview}
                    disabled={loading}
                >
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {/* ERROR */}

            {error && (
                <div className="security-error">
                    {error}
                </div>
            )}

            {/* LOADING */}

            {loading && !data && (
                <div className="panel security-empty">
                    Loading security information...
                </div>
            )}

            {/* SECURITY INFORMATION */}

            {data && (
                <>
                    {/* SUMMARY */}

                    <section className="security-summary">

                        <article className="security-summary-card">
                            <span>Active sessions</span>

                            <strong>
                                {data.summary.activeSessions}
                            </strong>

                            <small>
                                Current authenticated sessions
                            </small>
                        </article>

                        <article className="security-summary-card">
                            <span>Users online</span>

                            <strong>
                                {data.summary.usersWithActiveSessions}
                            </strong>

                            <small>
                                Users with recent activity
                            </small>
                        </article>

                        <article className="security-summary-card">
                            <span>Multiple session alerts</span>

                            <strong>
                                {data.summary.usersWithMultipleSessions}
                            </strong>

                            <small>
                                Users with more than one active session
                            </small>
                        </article>

                    </section>

                    {/* CURRENT SESSION */}

                    <section className="panel security-panel">

                        <div className="security-section-heading">
                            <div>
                                <h2>Current session</h2>

                                <p>
                                    Information about your authenticated session.
                                </p>
                            </div>

                            <span className={statusClass(
                                data.currentSession.status
                            )}>
                                {statusLabel(
                                    data.currentSession.status
                                )}
                            </span>
                        </div>

                        <div className="security-session-grid">

                            <div>
                                <span>Session created</span>

                                <strong>
                                    {formatDate(
                                        data.currentSession.createdAt
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Last activity</span>

                                <strong>
                                    {formatDate(
                                        data.currentSession.lastActivity
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Expiration</span>

                                <strong>
                                    {formatDate(
                                        data.currentSession.expiresAt
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Inactivity limit</span>

                                <strong>
                                    {data.sessionPolicy.inactivityMinutes}
                                    {' minutes'}
                                </strong>
                            </div>

                            <div>
                                <span>Single session per user</span>

                                <strong>
                                    {data.sessionPolicy.singleSessionPerUser
                                        ? 'Enabled'
                                        : 'Disabled'}
                                </strong>
                            </div>

                        </div>
                    </section>

                    {/* SECURITY CONTROLS */}

                    <section className="panel security-panel">

                        <div className="security-section-heading">
                            <div>
                                <h2>Security controls</h2>

                                <p>
                                    Current application security mechanisms.
                                </p>
                            </div>
                        </div>

                        <div className="security-controls-grid">
                            {data.controls.map(control => (
                                <article
                                    className="security-control-card"
                                    key={control.name}
                                >
                                    <div className="security-control-header">
                                        <h3>{control.name}</h3>

                                        <span className={statusClass(
                                            control.status
                                        )}>
                                            {statusLabel(control.status)}
                                        </span>
                                    </div>

                                    <p>
                                        {control.detail}
                                    </p>
                                </article>
                            ))}
                        </div>

                    </section>

                    {/* MULTIPLE SESSION ALERTS */}

                    {data.multipleSessions.length > 0 && (
                        <section className="security-warning">
                            <h2>Multiple session alerts</h2>

                            <p>
                                The following users have more than one
                                session matching the active-session criteria.
                            </p>

                            <div className="security-table-wrapper">
                                <table className="security-table">
                                    <thead>
                                        <tr>
                                            <th>User code</th>
                                            <th>User</th>
                                            <th>Role</th>
                                            <th>Active sessions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {data.multipleSessions.map(item => (
                                            <tr key={item.user_id}>
                                                <td>{item.code}</td>
                                                <td>{item.name}</td>
                                                <td>{item.role_name}</td>
                                                <td>
                                                    {item.active_session_count}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* ACTIVE SESSIONS */}

                    <section className="panel security-panel">

                        <div className="security-section-heading">
                            <div>
                                <h2>Active user sessions</h2>

                                <p>
                                    Sessions with activity during the last
                                    three minutes and valid expiration.
                                </p>
                            </div>

                            <span className="security-count">
                                {data.activeSessions.length} shown
                            </span>
                        </div>

                        {data.activeSessions.length === 0 ? (
                            <div className="security-empty">
                                No active sessions found.
                            </div>
                        ) : (
                            <div className="security-table-wrapper">
                                <table className="security-table">
                                    <thead>
                                        <tr>
                                            <th>User code</th>
                                            <th>User</th>
                                            <th>Role</th>
                                            <th>Site</th>
                                            <th>Last activity</th>
                                            <th>Expiration</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {data.activeSessions.map(
                                            (session, index) => (
                                                <tr
                                                    key={`${session.code}-${index}`}
                                                >
                                                    <td>{session.code}</td>
                                                    <td>{session.name}</td>
                                                    <td>{session.role_name}</td>
                                                    <td>{session.site_name}</td>
                                                    <td>
                                                        {formatDate(
                                                            session.last_activity
                                                        )}
                                                    </td>
                                                    <td>
                                                        {formatDate(
                                                            session.expires_at
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* INFORMATION NOTE */}

                    <div className="security-information">
                        This page displays the security controls and session
                        information currently available in BARLOUNGE. A
                        control marked as Partial requires additional
                        implementation or verification.
                    </div>
                </>
            )}
        </div>
    );
}
