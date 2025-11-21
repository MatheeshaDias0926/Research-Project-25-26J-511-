import "./LoadingSpinner.css";

export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="loading-container">
      {/* Animated Background */}
      <div className="loading-bg">
        <div className="loading-bg-orb loading-bg-orb-1"></div>
        <div
          className="loading-bg-orb loading-bg-orb-2"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Loading Content */}
      <div className="loading-content">
        {/* Spinner */}
        <div className="loading-spinner-wrapper">
          <div className="loading-spinner-track"></div>
          <div className="loading-spinner"></div>
        </div>

        {/* Message */}
        <p className="loading-message">{message}</p>

        {/* Loading Dots */}
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
      </div>
    </div>
  );
}
