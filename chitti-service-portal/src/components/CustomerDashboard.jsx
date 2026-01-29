import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./CustomerDashboard.css";

function CustomerDashboard({ session }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    bicycle_model: "",
    issue_type: "",
    description: "",
    priority: "medium",
  });

  useEffect(() => {
    fetchComplaints();

    // Subscribe to changes in complaints
    const subscription = supabase
      .channel("customer_complaints")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "complaints",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          fetchComplaints();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session.user.id]);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("complaints").insert([
        {
          user_id: session.user.id,
          bicycle_model: formData.bicycle_model,
          issue_type: formData.issue_type,
          description: formData.description,
          priority: formData.priority,
          status: "pending",
        },
      ]);

      if (error) throw error;

      setShowForm(false);
      setFormData({
        bicycle_model: "",
        issue_type: "",
        description: "",
        priority: "medium",
      });
      alert("Service request submitted successfully!");
      fetchComplaints();
    } catch (error) {
      console.error("Error submitting complaint:", error);
      alert("Error submitting request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "#f59e0b",
      "in-progress": "#3b82f6",
      completed: "#10b981",
      cancelled: "#ef4444",
    };
    return colors[status] || "#6b7280";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "#10b981",
      medium: "#f59e0b",
      high: "#ef4444",
    };
    return colors[priority] || "#6b7280";
  };

  if (loading && complaints.length === 0) {
    return <div className="loading">Loading your service requests...</div>;
  }

  return (
    <div className="customer-dashboard">
      <div className="dashboard-header">
        <h2>My Service Requests</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Service Request"}
        </button>
      </div>

      {showForm && (
        <div className="complaint-form-container">
          <h3>Submit Service Request</h3>
          <form onSubmit={handleSubmit} className="complaint-form">
            <div className="form-group">
              <label htmlFor="bicycle_model">Bicycle Model *</label>
              <input
                type="text"
                id="bicycle_model"
                name="bicycle_model"
                value={formData.bicycle_model}
                onChange={handleChange}
                placeholder="e.g., EV-Sport 2024"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="issue_type">Issue Type *</label>
              <select
                id="issue_type"
                name="issue_type"
                value={formData.issue_type}
                onChange={handleChange}
                required
              >
                <option value="">Select issue type</option>
                <option value="battery">Battery Issue</option>
                <option value="motor">Motor Problem</option>
                <option value="brakes">Brake System</option>
                <option value="electrical">Electrical System</option>
                <option value="mechanical">Mechanical Issue</option>
                <option value="display">Display/Controls</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority *</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Please describe the issue in detail..."
                rows="4"
                required
              />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>
      )}

      <div className="complaints-list">
        {complaints.length === 0 ? (
          <div className="empty-state">
            <p>No service requests yet</p>
            <p className="empty-subtitle">
              Click "New Service Request" to submit your first request
            </p>
          </div>
        ) : (
          <div className="complaints-grid">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="complaint-card">
                <div className="complaint-header">
                  <span className="complaint-id">
                    #{complaint.id.slice(0, 8)}
                  </span>
                  <div className="complaint-badges">
                    <span
                      className="badge badge-status"
                      style={{
                        backgroundColor: getStatusColor(complaint.status),
                      }}
                    >
                      {complaint.status}
                    </span>
                    <span
                      className="badge badge-priority"
                      style={{
                        backgroundColor: getPriorityColor(complaint.priority),
                      }}
                    >
                      {complaint.priority}
                    </span>
                  </div>
                </div>

                <div className="complaint-body">
                  <h4>{complaint.bicycle_model}</h4>
                  <p className="issue-type">
                    <strong>Issue:</strong> {complaint.issue_type}
                  </p>
                  <p className="description">{complaint.description}</p>

                  {complaint.company_notes && (
                    <div className="company-notes">
                      <strong>Company Notes:</strong>
                      <p>{complaint.company_notes}</p>
                    </div>
                  )}
                </div>

                <div className="complaint-footer">
                  <span className="date">
                    Submitted:{" "}
                    {new Date(complaint.created_at).toLocaleDateString()}
                  </span>
                  {complaint.updated_at !== complaint.created_at && (
                    <span className="date">
                      Updated:{" "}
                      {new Date(complaint.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerDashboard;
