import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout() {
  return <div className="app-shell"><Sidebar /><div className="main-area"><Header /><div className="content"><Outlet /></div></div></div>;
}