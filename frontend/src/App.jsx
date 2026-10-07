import {
    Navigate,
    Route,
    Routes
} from 'react-router-dom';
import FlashMessage from './components/FlashMessage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import EditProduct from './pages/EditProduct';
import EditProductType from './pages/EditProductType';
import EditSite from './pages/EditSite';
import EditSupplier from './pages/EditSupplier';
import EditUser from './pages/EditUser';
import Inventory from './pages/Inventory';
import Login from './pages/Login';
import NewProduct from './pages/NewProduct';
import NewProductType from './pages/NewProductType';
import NewSite from './pages/NewSite';
import NewSupplier from './pages/NewSupplier';
import NewUser from './pages/NewUser';
import Products from './pages/Products';
import ProductTypes from './pages/ProductTypes';
import RecoverPassword from './pages/RecoverPassword';
import Sites from './pages/Sites';
import Suppliers from './pages/Suppliers';
import Users from './pages/Users';

export default function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route
                    path="/login"
                    element={<Login />}
                />
                <Route
                    path="/recover-password"
                    element={<RecoverPassword />}
                />
                <Route
                    element={<ProtectedRoute />}
                >
                    <Route
                        element={<Layout />}
                    >
                        <Route
                            path="/dashboard"
                            element={<Dashboard />}
                        />
                        <Route
                            element={
                                <ProtectedRoute
                                    allowedRoles={[
                                        'Administrador'
                                    ]}
                                />
                            }
                        >
                            <Route
                                path="/users"
                                element={<Users />}
                            />
                            <Route
                                path="/users/new"
                                element={<NewUser />}
                            />
                            <Route
                                path="/users/:id/edit"
                                element={<EditUser />}
                            />
                            <Route
                                path="/sites"
                                element={<Sites />}
                            />
                            <Route
                                path="/sites/new"
                                element={<NewSite />}
                            />
                            <Route
                                path="/sites/:id/edit"
                                element={<EditSite />}
                            />
                            <Route
                                path="/products"
                                element={<Products />}
                            />
                            <Route
                                path="/products/new"
                                element={<NewProduct />}
                            />
                            <Route
                                path="/products/:id/edit"
                                element={<EditProduct />}
                            />
                            <Route
                                path="/suppliers"
                                element={<Suppliers />}
                            />
                            <Route
                                path="/suppliers/new"
                                element={<NewSupplier />}
                            />
                            <Route
                                path="/suppliers/:id/edit"
                                element={<EditSupplier />}
                            />
                            <Route
                                path="/product-types"
                                element={<ProductTypes />}
                            />
                            <Route
                                path="/product-types/new"
                                element={<NewProductType />}
                            />
                            <Route
                                path="/product-types/:id/edit"
                                element={<EditProductType />}
                            />
                        </Route>
                        <Route
                            element={
                                <ProtectedRoute
                                    allowedRoles={[
                                        'Administrador',
                                        'Cajero'
                                    ]}
                                />
                            }
                        >
                            <Route
                                path="/inventory"
                                element={<Inventory />}
                            />
                        </Route>
                    </Route>
                </Route>
                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/dashboard"
                            replace
                        />
                    }
                />
            </Routes>
            <FlashMessage />
        </AuthProvider>
    );
}