const LoadingSpinner = ({ size = "md", color = "var(--color-primary-500)" }) => {
  const sizeMap = {
    sm: { diameter: 24, borderWidth: 2 },
    md: { diameter: 40, borderWidth: 3 },
    lg: { diameter: 56, borderWidth: 3 },
  };

  const { diameter, borderWidth } = sizeMap[size];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          width: diameter,
          height: diameter,
          border: `${borderWidth}px solid rgba(0, 0, 0, 0.1)`,
          borderTop: `${borderWidth}px solid ${color}`,
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
    </div>
  );
};

export default LoadingSpinner;
