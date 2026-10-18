import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DoxologosLogo from '@/components/brand/DoxologosLogo';

const CheckoutHeader = ({ onBack }) => {
    return (
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-2" aria-label="Doxologos - Página inicial">
                    <DoxologosLogo className="h-9 md:h-10 w-auto" />
                </Link>
                <Button
                    variant="outline"
                    className="border-[#2d8659] text-[#2d8659]"
                    onClick={onBack}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                </Button>
            </nav>
        </header>
    );
};

export default CheckoutHeader;
