import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auctionAPI } from "../api/client";
import { format } from "date-fns";
import {
  ChevronLeft,
  Loader,
  AlertCircle,
  TrendingDown,
  X,
  Plus,
} from "lucide-react";

export default function AuctionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("bids");
  const [selectedBid, setSelectedBid] = useState(null);

  useEffect(() => {
    loadAuctionDetails();
  }, [id]);

  const loadAuctionDetails = async () => {
    setLoading(true);
    try {
      const [auctionRes, statsRes] = await Promise.all([
        auctionAPI.getRFQ(id),
        auctionAPI.getRFQStatistics(id),
      ]);
      setAuction(auctionRes.data);
      setStats(statsRes.data);
      setError(null);
    } catch (err) {
      setError("Failed to load auction details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center space-x-3">
          <AlertCircle className="text-red-600" size={24} />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  const formatTime = (datetime) =>
    format(new Date(datetime), "MMM dd, yyyy HH:mm");

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
      >
        <ChevronLeft size={20} />
        <span>Back to Auctions</span>
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{auction.name}</h1>
            <p className="text-gray-600 mt-2">
              Reference: {auction.reference_id}
            </p>
          </div>
          <div className="flex flex-col gap-3 items-end">
            <span
              className={`badge ${auction.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
            >
              {auction.status_display}
            </span>
            {auction.status === "active" && (
              <button
                onClick={() => navigate(`/auctions/${id}/bid`)}
                className="btn btn-primary flex items-center space-x-2 whitespace-nowrap"
              >
                <Plus size={18} />
                <span>Submit Bid</span>
              </button>
            )}
          </div>
        </div>

        {/* Key Information */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Bid Start</p>
            <p className="font-semibold text-gray-900">
              {formatTime(auction.bid_start_time)}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Current Close</p>
            <p className="font-semibold text-gray-900">
              {formatTime(
                auction.auction?.current_close_time || auction.bid_close_time,
              )}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Force Close</p>
            <p className="font-semibold text-gray-900">
              {formatTime(auction.forced_close_time)}
            </p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Extensions</p>
            <p className="font-semibold text-gray-900">
              {auction.auction?.extension_count || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-2">Total Bids</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total_bids}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-2">Suppliers</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total_suppliers}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-2">Lowest Bid</p>
            {stats.lowest_bid ? (
              <div>
                <p className="text-2xl font-bold text-green-600">
                  ${parseFloat(stats.lowest_bid.total_charges).toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {stats.lowest_bid.supplier}
                </p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-600">N/A</p>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b flex">
          {["bids", "events", "extensions"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "bids" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">
                      Rank
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">
                      Supplier
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">
                      Carrier
                    </th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">
                      Total Charges
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auction.bids?.map((bid) => (
                    <tr
                      key={bid.id}
                      onClick={() => setSelectedBid(bid)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        {bid.rank || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {bid.supplier_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {bid.carrier_name}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        ${parseFloat(bid.total_charges).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "events" && (
            <div className="space-y-4">
              {auction.events?.map((event) => (
                <div
                  key={event.id}
                  className="border-l-4 border-blue-600 pl-4 py-2"
                >
                  <p className="font-semibold text-gray-900">
                    {event.event_type.replace("_", " ").toUpperCase()}
                  </p>
                  <p className="text-gray-600 text-sm">{event.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime(event.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "extensions" && (
            <div className="space-y-4">
              {auction.extension_history?.map((ext) => (
                <div
                  key={ext.id}
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                >
                  <div className="flex items-start space-x-3">
                    <TrendingDown className="text-yellow-600 mt-1" size={20} />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        Extended by {ext.duration_mins} minutes
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        From {formatTime(ext.prev_close_time)} to{" "}
                        {formatTime(ext.new_close_time)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Reason: {ext.trigger_reason.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bid Details Modal */}
      {selectedBid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b flex justify-between items-center p-6">
              <h2 className="text-2xl font-bold text-gray-900">Bid Details</h2>
              <button
                onClick={() => setSelectedBid(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Supplier & Carrier Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Supplier</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedBid.supplier_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Carrier</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedBid.carrier_name}
                  </p>
                </div>
              </div>

              {/* Rank & Submission Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Rank</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedBid.rank ? `#${selectedBid.rank}` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Submitted</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatTime(selectedBid.created_at)}
                  </p>
                </div>
              </div>

              {/* Charges Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Charges Breakdown
                </h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Freight Charges</span>
                  <span className="font-semibold text-gray-900">
                    ${parseFloat(selectedBid.freight_charges).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Origin Charges</span>
                  <span className="font-semibold text-gray-900">
                    ${parseFloat(selectedBid.origin_charges).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Destination Charges</span>
                  <span className="font-semibold text-gray-900">
                    ${parseFloat(selectedBid.destination_charges).toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">
                    Total Charges
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    ${parseFloat(selectedBid.total_charges).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Service Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Transit Time</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedBid.transit_time_days}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">days</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Quote Validity</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedBid.quote_validity_days}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">days</p>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setSelectedBid(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
