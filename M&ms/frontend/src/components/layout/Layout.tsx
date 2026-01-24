import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

import InviteHandler from '../game/InviteHandler';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const isGamePage = location.pathname.startsWith('/game');

    return (
        <div className="flex flex-col min-h-screen">
            <InviteHandler />
            {!isGamePage && <Navbar />}
            <div id="contentArea" className="flex-1 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </div>
            </div>
            {!isGamePage && <Footer />}
        </div>
    );
};

export default Layout;
