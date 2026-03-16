interface CompanyLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  color?: string;
  siteName?: string;
}

export const CompanyLogo = ({ size = 40, className = "", showText = false, color = "currentColor", siteName = "Nature.co" }: CompanyLogoProps) => (
  <div className={`flex flex-col items-center ${className}`}>
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="transition-all duration-500"
    >
      {/* Green Drop/Leaf Shape - Solid Color */}
      <path 
        d="M50 5C35 20 15 40 15 60C15 78 30 95 50 95C70 95 85 78 85 60C85 40 65 20 50 5Z" 
        fill="#4ADE80"
      />
      
      {/* Large Bold White "N" Letter */}
      <text
        x="50"
        y="70"
        fontSize="55"
        fontWeight="900"
        fill="white"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
      >
        N
      </text>
    </svg>
    {showText && (
      <span className="mt-2 text-xs font-black tracking-widest uppercase opacity-80" style={{ color }}>
        {siteName}
      </span>
    )}
  </div>
);
