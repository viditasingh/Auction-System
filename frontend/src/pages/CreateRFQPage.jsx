import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auctionAPI } from "../api/client";
import { ChevronLeft, AlertCircle } from "lucide-react";

export default function CreateRFQPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    reference_id: "",
    name: "",
    bid_start_time: "",
    bid_close_time: "",
    forced_close_time: "",
    pickup_date: "",
    trigger_window_mins: 10,
    extension_duration_mins: 5,
    trigger_type: "bid",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const getUTCDateTime = (localDateTime) => {
        if (!localDateTime) return null;
        const date = new Date(localDateTime);
        const offset = date.getTimezoneOffset() * 60000; // Convert to milliseconds
        const utcDate = new Date(date.getTime() - offset);
        return utcDate.toISOString().slice(0, 19); // Remove milliseconds
      };

      const utcFormData = {
        ...formData,
        bid_start_time: getUTCDateTime(formData.bid_start_time),
        bid_close_time: getUTCDateTime(formData.bid_close_time),
        forced_close_time: getUTCDateTime(formData.forced_close_time),
      };

      const response = await auctionAPI.createRFQ(formData);
      navigate(`/auctions/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create RFQ");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
      >
        <ChevronLeft size={20} />
        <span>Back</span>
      </button>

      <div className="bg-white rounded-lg shadow-md p-10 max-w-2xl md:p-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Create New RFQ
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center space-x-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Reference ID</label>
              <input
                type="text"
                name="reference_id"
                value={formData.reference_id}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">RFQ Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Bid Start Time</label>
              <input
                type="datetime-local"
                name="bid_start_time"
                value={formData.bid_start_time}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bid Close Time</label>
              <input
                type="datetime-local"
                name="bid_close_time"
                value={formData.bid_close_time}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Forced Close Time</label>
              <input
                type="datetime-local"
                name="forced_close_time"
                value={formData.forced_close_time}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pickup Date</label>
              <input
                type="date"
                name="pickup_date"
                value={formData.pickup_date}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <hr className="my-6" />

          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Auction Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Trigger Window (minutes)</label>
              <input
                type="number"
                name="trigger_window_mins"
                value={formData.trigger_window_mins}
                onChange={handleChange}
                className="form-input"
                min="1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minutes before close time to monitor activity
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Extension Duration (minutes)</label>
              <input
                type="number"
                name="extension_duration_mins"
                value={formData.extension_duration_mins}
                onChange={handleChange}
                className="form-input"
                min="1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minutes to extend auction when triggered
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Extension Trigger Type</label>
            <select
              name="trigger_type"
              value={formData.trigger_type}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="bid">Bid Received</option>
              <option value="rank_change">Any Rank Change</option>
              <option value="l1_change">L1 Rank Change</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              What activity triggers extension
            </p>
          </div>

          <div className="flex space-x-4 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? "Creating..." : "Create RFQ"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
