import { useEffect, useState } from 'react';
import { getDashboard } from '../services/dashboardService';

export default function Dashboard() {

    // =========================================================
    // ESTADO DEL DASHBOARD
    // =========================================================
    const [d, setD] = useState(null);
    const [error, setError] = useState('');

    // =========================================================
    // CARGAR INFORMACIÓN DEL DASHBOARD
    // =========================================================
    useEffect(() => {

        getDashboard()
            .then(setD)
            .catch((e) => {

                setError(
                    e.response?.data?.message ||
                    'Unable to load dashboard.'
                );

            });

    }, []);

    // =========================================================
    // MOSTRAR ERROR
    // =========================================================
    if (error) {

        return (
            <div className="panel">

                <div className="alert error">
                    {error}
                </div>

            </div>
        );
    }

    // =========================================================
    // MOSTRAR CARGA
    // =========================================================
    if (!d) {

        return (
            <div className="panel loading">
                Loading dashboard...
            </div>
        );
    }

    // =========================================================
    // TARJETAS PRINCIPALES
    // =========================================================
    //
    // Se mantienen las 6 tarjetas originales del dashboard.
    //
    // Actualmente:
    // - Usuarios: información real
    // - Sitios: información real
    // - Productos: información real
    // - Unidades de inventario: información real
    // - Órdenes: 0 mientras no exista el módulo de pedidos
    // - Ventas: $0 mientras no exista el módulo de ventas
    //
    // =========================================================
    const cards = [
        [
            'Users',
            d.users
        ],

        [
            'Sites',
            d.sites
        ],

        [
            'Products',
            d.products
        ],

        [
            'Inventory units',
            d.inventoryUnits
        ],

        [
            'Orders',
            d.orders
        ],

        [
            'Sales',
            `$ ${Number(
                d.sales || 0
            ).toLocaleString('en-US')}`
        ]
    ];

    // =========================================================
    // RENDER
    // =========================================================
    return (
        <div className="page">

            {/* =================================================
                ENCABEZADO ORIGINAL
               ================================================= */}
            <div className="page-heading">

                <div>

                    <h1>
                        Panel
                    </h1>

                    <p>
                        General overview of operation
                    </p>

                </div>

            </div>


            {/* =================================================
                6 TARJETAS ORIGINALES
               ================================================= */}
            <div className="cards">

                {cards.map(
                    ([label, value]) => (

                        <article
                            className="metric"
                            key={label}
                        >

                            <span>
                                {label}
                            </span>

                            <strong>
                                {value}
                            </strong>

                        </article>

                    )
                )}

            </div>


            {/* =================================================
                PARTE INFERIOR
                =================================================
                
                Esta sección se agrega debajo de las tarjetas
                originales.

                Los datos de ventas y pedidos todavía no existen,
                por lo tanto mostramos el diseño vacío.
               ================================================= */}
            <div className="dashboard-bottom">


                {/* =============================================
                    GRÁFICA DE VENTAS POR SITIO
                   ============================================= */}
                <section className="dashboard-card">

                    <div className="dashboard-card-header">

                        <div>

                            <h2>
                                Sales by site
                            </h2>

                            <p>
                                Sales distribution by active site
                            </p>

                        </div>

                    </div>


                    {/* =========================================
                        ÁREA DE LA GRÁFICA
                       ========================================= */}
                    <div className="sales-chart">

                        {/* -------------------------------------
                            EJE VERTICAL
                           ------------------------------------- */}
                        <div className="sales-chart-axis">

                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>

                        </div>


                        {/* -------------------------------------
                            ÁREA PRINCIPAL DE LA GRÁFICA
                           ------------------------------------- */}
                        <div className="sales-chart-area">

                            {/* Líneas horizontales */}

                            <div className="sales-chart-line line-1"></div>

                            <div className="sales-chart-line line-2"></div>

                            <div className="sales-chart-line line-3"></div>

                            <div className="sales-chart-line line-4"></div>


                            {/* Mensaje cuando no existen datos */}
                            <div className="sales-chart-empty">
                                No sales data is available yet.
                            </div>

                        </div>

                    </div>

                </section>


                {/* =============================================
                    PEDIDOS ABIERTOS
                   ============================================= */}
                <section className="dashboard-card">

                    <div className="dashboard-card-header">

                        <div>

                            <h2>
                                Open orders
                            </h2>

                            <p>
                                Orders currently in progress
                            </p>

                        </div>

                    </div>


                    {/* =========================================
                        TABLA
                       ========================================= */}
                    <div className="orders-table-wrapper">

                        <table className="orders-dashboard-table">

                            <thead>

                                <tr>

                                    <th>
                                        Order
                                    </th>

                                    <th>
                                        Table
                                    </th>

                                    <th>
                                        Total
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                <tr>

                                    <td
                                        colSpan="3"
                                        className="orders-dashboard-empty"
                                    >
                                        There are no open orders.
                                    </td>

                                </tr>

                            </tbody>

                        </table>

                    </div>

                </section>

            </div>

        </div>
    );
}