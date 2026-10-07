import { useAuth } from '../context/AuthContext';
import { showFlash } from '../utils/flashMessage';

export default function Header() {

    const {
        user,
        logout
    } = useAuth();

    // =========================================================
    // GET USER ROLE
    // =========================================================
    const getRoleName = () => {

        const role =
            String(
                user?.role || ''
            ).toLowerCase();

        if (role.includes('admin')) {
            return 'Administrator';
        }

        if (
            role.includes('cajero') ||
            role.includes('cashier')
        ) {
            return 'Cashier';
        }

        if (
            role.includes('mesero') ||
            role.includes('waiter')
        ) {
            return 'Waiter';
        }

        return 'User';
    };

    return (
        <header className="topbar">

            {/* =================================================
                USER INFORMATION
               ================================================= */}

            <div className="topbar-user">

                <span className="topbar-role">
                    {getRoleName()}
                </span>

                <strong>
                    {user?.name}
                </strong>

            </div>


            {/* =================================================
                ACTIONS
               ================================================= */}

            <div className="topbar-actions">

                <button
                    type="button"
                    className="button ghost"
                    onClick={() => {
                      showFlash(
                        'success',
                        'You have been signed out.'
                      );
                      logout();
                    }}
                >
                    Sign out
                </button>

            </div>

        </header>
    );
}