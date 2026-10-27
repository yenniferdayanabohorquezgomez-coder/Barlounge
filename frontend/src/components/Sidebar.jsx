import { NavLink } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

// ============================================================
// OPCIONES DEL MENÚ
// ============================================================

const links = [
    // Todos los usuarios pueden acceder al Dashboard.
    [
        'Dashboard',
        '/dashboard',
        () => true
    ],

    // Solo Administrador.
    [
        'Users',
        '/users',
        (u) => u.role === 'Administrador'
    ],

    // Solo Administrador.
    [
        'Sites',
        '/sites',
        (u) => u.role === 'Administrador'
    ],

    // Solo Administrador.
    [
        'Products',
        '/products',
        (u) => u.role === 'Administrador'
    ],

    [
        'Product Assignment',
        '/product-assignments',
        (u) => u.role === 'Administrador'
    ],

    // Solo Administrador.
    [
        'Suppliers',
        '/suppliers',
        (u) => u.role === 'Administrador'
    ],

    // Solo Administrador.
    [
        'Product types',
        '/product-types',
        (u) => u.role === 'Administrador'
    ],

    [
        'Tables',
        '/tables',
        (u) =>
            [
                'Administrador',
                'Mesero'
            ].includes(u.role)
    ],

    // Administrador y Cajero.
    [
        'Inventory',
        '/inventory',
        (u) =>
            [
                'Administrador',
                'Cajero'
            ].includes(u.role)
    ]
];

// ============================================================
// COMPONENTE SIDEBAR
// ============================================================

export default function Sidebar() {

    // Usuario actualmente autenticado.
    const { user } = useAuth();

    return (
        <aside className="sidebar">

            {/* ==================================================
                LOGO DE LA EMPRESA
                ================================================== */}

            <div className="sidebar-brand">

                <img
                    src="/barlounge-logo.png"
                    alt="BARLOUNGE"
                    className="sidebar-logo"
                />

            </div>

            {/* ==================================================
                MENÚ DE NAVEGACIÓN
                ================================================== */}

            <nav>

                {links
                    // Filtramos las opciones dependiendo
                    // del rol del usuario.
                    .filter(
                        ([, , show]) =>
                            show(user)
                    )

                    // Creamos cada enlace del menú.
                    .map(
                        ([label, path]) => (
                            <NavLink
                                key={path}
                                to={path}
                                className={
                                    ({ isActive }) =>
                                        isActive
                                            ? 'nav-item active'
                                            : 'nav-item'
                                }
                            >
                                {label}
                            </NavLink>
                        )
                    )}

            </nav>

        </aside>
    );
}