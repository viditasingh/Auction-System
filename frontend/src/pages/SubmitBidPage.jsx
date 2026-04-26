import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auctionAPI } from "../api/client";
import { format } from "date-fns";
import { ChevronLeft, AlertCircle, Loader } from "lucide-react";

export default function SubmitBidPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    supplier_name:"",
    carrier_name: "",
    freight_charges: "",
    origin_charges: "",
    destination_charges: "",
    transit_time_days: "",
    quote_validity_days: "",
  });

  useEffect(() => {
    loadRFQDetails();
  }, [id]);

  const loadRFQDetails = async () => {
    setLoading(true);
    try {
      const response = await auctionAPI.getRFQ(id);
      setRfq(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load RFQ details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const bidData = {
        rfq: id,
        supplier_name: formData.supplier_name,
        carrier_name: formData.carrier_name,
        freight_charges: parseFloat(formData.freight_charges),
        origin_charges: parseFloat(formData.origin_charges),
        destination_charges: parseFloat(formData.destination_charges),
        transit_time_days: parseInt(formData.transit_time_days),
        quote_validity_days: parseInt(formData.quote_validity_days),
      };

      await auctionAPI.submitBid(bidData);
      navigate(`/auctions/${id}`);
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Failed to submit bid";
      setError(errorMessage);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalCharges =
    (parseFloat(formData.freight_charges) || 0) +
    (parseFloat(formData.origin_charges) || 0) +
    (parseFloat(formData.destination_charges) || 0);

  const formatTime = (datetime) =>
    format(new Date(datetime), "MMM dd, yyyy HH:mm");

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!rfq) {
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
          <p className="text-red-800">RFQ not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
      >
        <ChevronLeft size={20} />
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RFQ Details */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              RFQ Details
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Reference ID</p>
                <p className="font-semibold text-gray-900">
                  {rfq.reference_id}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Name</p>
                <p className="font-semibold text-gray-900">{rfq.name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span
                  className={`badge ${
                    rfq.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {rfq.status_display}
                </span>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">Bid Timeline</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Start</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(rfq.bid_start_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Close</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(
                        rfq.auction?.current_close_time || rfq.bid_close_time,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Force Close</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(rfq.forced_close_time)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">Pickup Date</p>
                <p className="font-semibold text-gray-900">
                  {format(new Date(rfq.pickup_date), "MMM dd, yyyy")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bid Submission Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Submit Your Bid
            </h2>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle
                  className="text-red-600 mt-0.5 flex-shrink-0"
                  size={20}
                />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Supplier Infor */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Your Name (Supplier) *
                </label>
                <input
                  type="text"
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {/* Carrier Information */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Carrier Name *
                </label>
                <input
                  type="text"
                  name="carrier_name"
                  value={formData.carrier_name}
                  onChange={handleChange}
                  placeholder="Enter carrier name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Charges Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Charges
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Freight Charges ($) *
                    </label>
                    <input
                      type="number"
                      name="freight_charges"
                      value={formData.freight_charges}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Origin Charges ($) *
                    </label>
                    <input
                      type="number"
                      name="origin_charges"
                      value={formData.origin_charges}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Destination Charges ($) *
                    </label>
                    <input
                      type="number"
                      name="destination_charges"
                      value={formData.destination_charges}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Total Charges Display */}
                <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">Total Charges</p>
                  <p className="text-3xl font-bold text-blue-900">
                    ${totalCharges.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Service Terms */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Service Terms
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Transit Time (days) *
                    </label>
                    <input
                      type="number"
                      name="transit_time_days"
                      value={formData.transit_time_days}
                      onChange={handleChange}
                      placeholder="e.g., 5"
                      min="1"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Quote Validity (days) *
                    </label>
                    <input
                      type="number"
                      name="quote_validity_days"
                      value={formData.quote_validity_days}
                      onChange={handleChange}
                      placeholder="e.g., 30"
                      min="1"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {submitting ? "Submitting..." : "Submit Bid"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
