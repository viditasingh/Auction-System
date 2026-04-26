import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex justify-center items-center min-h-[600px]">
      <div className="text-center space-y-6">
        <AlertCircle size={64} className="mx-auto text-gray-400" />
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
          <p className="text-xl text-gray-600 mb-4">Page not found</p>
          <p className="text-gray-500 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Link to="/" className="btn btn-primary inline-block">
          Go Home
        </Link>
      </div>
    </div>
  );
}
