import Layout from "./Layout.jsx";

import Lottery from "./Lottery";

import Welcome from "./Welcome";

import AdminDashboard from "./AdminDashboard";

import AllResults from "./AllResults";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Lottery: Lottery,
    
    Welcome: Welcome,
    
    AdminDashboard: AdminDashboard,
    
    AllResults: AllResults,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Lottery />} />
                
                
                <Route path="/Lottery" element={<Lottery />} />
                
                <Route path="/Welcome" element={<Welcome />} />
                
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                
                <Route path="/AllResults" element={<AllResults />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}