import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 py-3">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">BA</span>
            </div>
            <span className="font-bold text-lg text-gray-800 hidden sm:inline">
              British Auction
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8">
            <Link
              to="/auctions"
              className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                isActive("/auctions") || isActive("/")
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-600 hover:text-blue-600"
              }`}
            >
              Auctions
            </Link>
            <Link
              to="/create-rfq"
              className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                isActive("/create-rfq")
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-600 hover:text-blue-600"
              }`}
            >
              Create RFQ
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              to="/auctions"
              className="block py-2 px-3 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              Auctions
            </Link>
            <Link
              to="/create-rfq"
              className="block py-2 px-3 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              Create RFQ
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
