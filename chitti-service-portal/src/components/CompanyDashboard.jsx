import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./CompanyDashboard.css";

function CompanyDashboard({ session }) {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [companyNotes, setCompanyNotes] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  useEffect(() => {
    fetchComplaints();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel("company_complaints")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "complaints",
        },
        () => {
          fetchComplaints();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterComplaints();
    calculateStats();
  }, [complaints, filter]);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select(
          `
          *,
          users (
            name,
            email,
            phone
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterComplaints = () => {
    let filtered = complaints;

    if (filter === "pending") {
      filtered = complaints.filter((c) => c.status === "pending");
    } else if (filter === "in-progress") {
      filtered = complaints.filter((c) => c.status === "in-progress");
    } else if (filter === "completed") {
      filtered = complaints.filter((c) => c.status === "completed");
    } else if (filter === "all") {
      filtered = complaints;
    }

    setFilteredComplaints(filtered);
  };

  const calculateStats = () => {
    const newStats = {
      total: complaints.length,
      pending: complaints.filter((c) => c.status === "pending").length,
      inProgress: complaints.filter((c) => c.status === "in-progress").length,
      completed: complaints.filter((c) => c.status === "completed").length,
    };
    setStats(newStats);
  };

  const updateComplaintStatus = async (complaintId, newStatus) => {
    try {
      const { error } = await supabase
        .from("complaints")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", complaintId);

      if (error) throw error;
      fetchComplaints();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error updating status. Please try again.");
    }
  };

  const saveCompanyNotes = async (complaintId) => {
    try {
      const { error } = await supabase
        .from("complaints")
        .update({
          company_notes: companyNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", complaintId);

      if (error) throw error;

      alert("Notes saved successfully!");
      setSelectedComplaint(null);
      setCompanyNotes("");
      fetchComplaints();
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Error saving notes. Please try again.");
    }
  };

  const openComplaintModal = (complaint) => {
    setSelectedComplaint(complaint);
    setCompanyNotes(complaint.company_notes || "");
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

  if (loading) {
    return <div className="loading">Loading service requests...</div>;
  }

  return (
    <div className="company-dashboard">
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Total Requests</p>
        </div>
        <div className="stat-card pending">
          <h3>{stats.pending}</h3>
          <p>Pending</p>
        </div>
        <div className="stat-card in-progress">
          <h3>{stats.inProgress}</h3>
          <p>In Progress</p>
        </div>
        <div className="stat-card completed">
          <h3>{stats.completed}</h3>
          <p>Completed</p>
        </div>
      </div>

      <div className="dashboard-controls">
        <h2>Service Requests Management</h2>
        <div className="filter-buttons">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={filter === "pending" ? "active" : ""}
            onClick={() => setFilter("pending")}
          >
            Pending
          </button>
          <button
            className={filter === "in-progress" ? "active" : ""}
            onClick={() => setFilter("in-progress")}
          >
            In Progress
          </button>
          <button
            className={filter === "completed" ? "active" : ""}
            onClick={() => setFilter("completed")}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="complaints-table-container">
        {filteredComplaints.length === 0 ? (
          <div className="empty-state">
            <p>No {filter !== "all" ? filter : ""} service requests</p>
          </div>
        ) : (
          <table className="complaints-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Model</th>
                <th>Issue Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map((complaint) => (
                <tr key={complaint.id}>
                  <td className="id-cell">#{complaint.id.slice(0, 8)}</td>
                  <td>{complaint.users?.name || "N/A"}</td>
                  <td>
                    <div className="contact-info">
                      <div>{complaint.users?.email}</div>
                      <div className="phone">{complaint.users?.phone}</div>
                    </div>
                  </td>
                  <td>{complaint.bicycle_model}</td>
                  <td>
                    <span className="issue-badge">{complaint.issue_type}</span>
                  </td>
                  <td>
                    <span
                      className="priority-badge"
                      style={{
                        backgroundColor: getPriorityColor(complaint.priority),
                      }}
                    >
                      {complaint.priority}
                    </span>
                  </td>
                  <td>
                    <select
                      className="status-select"
                      value={complaint.status}
                      onChange={(e) =>
                        updateComplaintStatus(complaint.id, e.target.value)
                      }
                      style={{
                        backgroundColor: getStatusColor(complaint.status),
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="date-cell">
                    {new Date(complaint.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => openComplaintModal(complaint)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedComplaint && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedComplaint(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Service Request Details</h3>
              <button
                className="modal-close"
                onClick={() => setSelectedComplaint(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h4>Customer Information</h4>
                <p>
                  <strong>Name:</strong> {selectedComplaint.users?.name}
                </p>
                <p>
                  <strong>Email:</strong> {selectedComplaint.users?.email}
                </p>
                <p>
                  <strong>Phone:</strong> {selectedComplaint.users?.phone}
                </p>
              </div>

              <div className="detail-section">
                <h4>Request Details</h4>
                <p>
                  <strong>Request ID:</strong> #{selectedComplaint.id}
                </p>
                <p>
                  <strong>Bicycle Model:</strong>{" "}
                  {selectedComplaint.bicycle_model}
                </p>
                <p>
                  <strong>Issue Type:</strong> {selectedComplaint.issue_type}
                </p>
                <p>
                  <strong>Priority:</strong>{" "}
                  <span
                    className="priority-badge"
                    style={{
                      backgroundColor: getPriorityColor(
                        selectedComplaint.priority,
                      ),
                    }}
                  >
                    {selectedComplaint.priority}
                  </span>
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getStatusColor(selectedComplaint.status),
                    }}
                  >
                    {selectedComplaint.status}
                  </span>
                </p>
                <p>
                  <strong>Submitted:</strong>{" "}
                  {new Date(selectedComplaint.created_at).toLocaleString()}
                </p>
                <p>
                  <strong>Last Updated:</strong>{" "}
                  {new Date(selectedComplaint.updated_at).toLocaleString()}
                </p>
              </div>

              <div className="detail-section">
                <h4>Issue Description</h4>
                <p className="description-text">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="detail-section">
                <h4>Company Notes</h4>
                <textarea
                  className="notes-textarea"
                  value={companyNotes}
                  onChange={(e) => setCompanyNotes(e.target.value)}
                  placeholder="Add internal notes about this service request..."
                  rows="4"
                />
                <button
                  className="btn-save-notes"
                  onClick={() => saveCompanyNotes(selectedComplaint.id)}
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyDashboard;
