import { useEffect, useState } from 'react';
import { getDashboard } from '../services/dashboardService';

const currency = (value) =>
    `$ ${Number(value || 0).toLocaleString('es-CO', {
        maximumFractionDigits: 0
    })}`;

export default function Dashboard() {
    const [d, setD] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        const loadDashboard = async () => {
            try {
                const data = await getDashboard();

                if (active) {
                    setD(data);
                    setError('');
                }
            } catch (e) {
                if (active) {
                    setError(
                        e.response?.data?.message ||
                        'No se pudo cargar el dashboard.'
                    );
                }
            }
        };

        loadDashboard();

        // Actualizar los datos cada 30 segundos.
        const interval = setInterval(loadDashboard, 30000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, []);

    if (error) {
        return (
            <div className="panel">
                <div className="alert error">{error}</div>
            </div>
        );
    }

    if (!d) {
        return (
            <div className="panel loading">
                Cargando dashboard...
            </div>
        );
    }

    const cards = [
        ['Users', d.users],
        ['Sites', d.sites],
        ['Products', d.products],
        ['Inventory units', d.inventoryUnits],
        ['Orders', d.orders],
        ['Sales', currency(d.sales)]
    ];

    const salesBySite = d.salesBySite || [];
    const openOrders = d.openOrders || [];

    const maxSales = Math.max(
        1,
        ...salesBySite.map(site => Number(site.total) || 0)
    );

    return (
        <div className="page">
            <div className="page-heading">
                <div>
                    <h1>Panel</h1>
                    <p>General overview of operation</p>
                </div>
            </div>

            {/* TARJETAS SUPERIORES */}
            <div className="cards">
                {cards.map(([label, value]) => (
                    <article className="metric" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                    </article>
                ))}
            </div>

            {/* SECCIÓN INFERIOR */}
            <div className="dashboard-bottom">

                {/* VENTAS POR SEDE */}
                <section className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div>
                            <h2>Sales by site</h2>
                            <p>
                                Completed sales grouped by site
                            </p>
                        </div>
                    </div>

                    {salesBySite.length === 0 ? (
                        <div className="dashboard-empty">
                            No sites available.
                        </div>
                    ) : salesBySite.every(
                        site => Number(site.total) === 0
                    ) ? (
                        <div className="dashboard-empty">
                            No completed sales are available yet.
                        </div>
                    ) : (
                        <div className="site-sales-list">
                            {salesBySite.map(site => {
                                const total = Number(site.total) || 0;
                                const percentage =
                                    (total / maxSales) * 100;

                                return (
                                    <div
                                        className="site-sales-item"
                                        key={site.site_id}
                                    >
                                        <div className="site-sales-label">
                                            <span title={site.site_name}>
                                                {site.site_name}
                                            </span>

                                            <strong>
                                                {currency(total)}
                                            </strong>
                                        </div>

                                        <div className="site-sales-track">
                                            <div
                                                className="site-sales-bar"
                                                style={{
                                                    width: `${percentage}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* PEDIDOS ABIERTOS */}
                <section className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div>
                            <h2>Open orders</h2>
                            <p>Orders currently in progress</p>
                        </div>
                    </div>

                    <div className="orders-table-wrapper">
                        <table className="orders-dashboard-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Table</th>
                                    <th>Total</th>
                                </tr>
                            </thead>

                            <tbody>
                                {openOrders.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="3"
                                            className="orders-dashboard-empty"
                                        >
                                            There are no open orders.
                                        </td>
                                    </tr>
                                ) : (
                                    openOrders.map(order => (
                                        <tr key={order.order_id}>
                                            <td>
                                                #{order.order_id}
                                            </td>

                                            <td>
                                                {order.table_number}
                                            </td>

                                            <td>
                                                {currency(order.total)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {openOrders.length > 0 && (
                        <p className="orders-dashboard-count">
                            Showing {openOrders.length} open order(s)
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}