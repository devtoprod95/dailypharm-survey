import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-gray-50 border-t border-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-sm text-gray-500">
                    &copy; 2026 DailyPharm Survey System. All rights reserved.
                </p>
                <div className="mt-2 flex justify-center space-x-4 text-xs text-gray-400">
                    <span>Privacy Policy</span>
                    <span>Terms of Service</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;