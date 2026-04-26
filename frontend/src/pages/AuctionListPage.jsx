import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auctionAPI } from "../api/client";
import { formatDistanceToNow } from "date-fns";
import { Eye, Plus, AlertCircle, Loader } from "lucide-react";

export default function AuctionListPage() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadAuctions();
  }, [filter]);

  const loadAuctions = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const response = await auctionAPI.getRFQs(params);
      setAuctions(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load auctions");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      active: "bg-blue-100 text-blue-800",
      closed: "bg-gray-100 text-gray-800",
      force_closed: "bg-red-100 text-red-800",
      draft: "bg-yellow-100 text-yellow-800",
    };

    return statusMap[status] || "bg-gray-100 text-gray-800";
  };

  const getTimeRemaining = (closeTime) => {
    return formatDistanceToNow(new Date(closeTime), { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">British Auctions</h1>
          <p className="text-gray-600 mt-2 mb-6">
            Manage and track all active and closed RFQ auctions
          </p>
        </div>
        <Link
          to="/create-rfq"
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create RFQ</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-3 sm:gap-4 border-b pb-6">
        {["all", "draft", "active", "closed", "force_closed"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-3 border-b-2 font-medium transition-colors ${
              filter === status
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {status.replace("_", " ").charAt(0).toUpperCase() +
              status.replace("_", " ").slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Auctions Table */}
      {auctions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-600">No auctions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Reference ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    RFQ Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Lowest Bid
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Close Time
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auctions.map((auction) => (
                  <tr
                    key={auction.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {auction.reference_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {auction.name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`badge ${getStatusBadgeClass(auction.status)}`}
                      >
                        {auction.status_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {auction.lowest_bid
                        ? `$${parseFloat(auction.lowest_bid.total_charges).toFixed(2)}`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getTimeRemaining(auction.auction_config?.current_close_time || auction.bid_close_time)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/auctions/${auction.id}`}
                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Eye size={18} />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
